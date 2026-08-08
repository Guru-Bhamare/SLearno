// NOTE: self-contained (no `../_shared/*` imports) — the Supabase MCP
// deploy_edge_function tool fails to bundle relative cross-file imports;
// see CLAUDE.md. Duplicates cors/gemini/admin-client helpers inline.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_VISION_MODEL = 'gemini-flash-latest';

type GeminiVisionContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };
type GeminiVisionMessage = { role: 'system' | 'user' | 'assistant'; content: string | GeminiVisionContent[] };

async function imageUrlToInlineData(url: string): Promise<{ mime_type: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for Gemini: ${res.status}`);
  const mime_type = res.headers.get('content-type') || 'image/jpeg';
  const buffer = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
  }
  return { mime_type, data: btoa(binary) };
}

async function callGeminiVisionJSON<T>(messages: GeminiVisionMessage[]): Promise<T> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const model = Deno.env.get('GEMINI_VISION_MODEL') || DEFAULT_VISION_MODEL;

  const systemParts: string[] = [];
  const contents: { role: string; parts: unknown[] }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      if (typeof m.content === 'string') systemParts.push(m.content);
      continue;
    }
    const parts = typeof m.content === 'string'
      ? [{ text: m.content }]
      : await Promise.all(
          m.content.map(async (c) =>
            c.type === 'text' ? { text: c.text } : { inline_data: await imageUrlToInlineData(c.image_url.url) }
          )
        );
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  };
  if (systemParts.length) body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] };

  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== 'string') throw new Error('Gemini response missing content');

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${content}`);
  }
}

import { createClient } from 'jsr:@supabase/supabase-js@2';

function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceRoleKey);
}

type GeneratedCard =
  | { question_type: 'single'; front: string; back: string }
  | { question_type: 'multiple'; front: string; options: string[]; correct_options: number[] };

const SYSTEM_PROMPT = `You are a study-aid generator for an intern self-learning app. You are given the intern's
current focus resource (title/skill_area) and a photo of their academic homework. Read the homework and, grounded
in BOTH the homework content and the focus skill, produce 4-6 flashcards. Mix two kinds:
- "single": a recall question with a short answer, using "front" and "back".
- "multiple": a multiple-choice question, using "front", 2-4 "options", and "correct_options" (array of correct
  option indices, 0-based).

Respond with EXACTLY ONE JSON object, no prose outside it:
{"extracted_summary":"1-2 sentence summary of the homework","cards":[{"question_type":"single","front":"string","back":"string"},{"question_type":"multiple","front":"string","options":["string"],"correct_options":[0]}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { profileId, resourceId, imagePath } = (await req.json()) as {
      profileId: string;
      resourceId: string | null;
      imagePath: string;
    };
    if (!profileId || !imagePath) throw new Error('profileId and imagePath are required');

    const admin = createAdminClient();

    const { data: publicUrlData } = admin.storage.from('homework').getPublicUrl(imagePath);
    const imageUrl = publicUrlData.publicUrl;

    let resource = null;
    if (resourceId) {
      const { data } = await admin.from('resources').select('title, skill_area').eq('id', resourceId).maybeSingle();
      resource = data;
    }

    const messages: GeminiVisionMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Focus resource: ${JSON.stringify(resource)}` },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ];

    const result = await callGeminiVisionJSON<{ extracted_summary: string; cards: GeneratedCard[] }>(messages);

    const { error: uploadError } = await admin.from('homework_uploads').insert({
      profile_id: profileId,
      resource_id: resourceId,
      image_path: imagePath,
      extracted_summary: result.extracted_summary ?? null,
    });
    if (uploadError) throw uploadError;

    const cardRows = (result.cards ?? []).map((c) => ({
      profile_id: profileId,
      front: c.front,
      back: c.question_type === 'single' ? c.back : '',
      source_type: 'homework',
      question_type: c.question_type,
      options: c.question_type === 'multiple' ? c.options : null,
      correct_options: c.question_type === 'multiple' ? c.correct_options : null,
      interval_stage: 0,
      next_due_at: new Date().toISOString(),
    }));

    if (cardRows.length > 0) {
      const { error: cardsError } = await admin.from('flashcards').insert(cardRows);
      if (cardsError) throw cardsError;
    }

    return new Response(JSON.stringify({ added: cardRows.length, extracted_summary: result.extracted_summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
