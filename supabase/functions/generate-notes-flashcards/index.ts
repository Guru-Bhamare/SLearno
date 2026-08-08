// NOTE: self-contained (no `../_shared/*` imports) — the Supabase MCP
// deploy_edge_function tool fails to bundle relative cross-file imports;
// see CLAUDE.md. Duplicates cors/gemini/admin-client helpers inline.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-flash-latest';

type GeminiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function callGeminiJSON<T>(messages: GeminiMessage[]): Promise<T> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

  const systemParts: string[] = [];
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
      continue;
    }
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
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

const SYSTEM_PROMPT = `You are a study-aid generator for an intern self-learning app. You are given one or more
days of an intern's free-form daily notes (each entry is whatever they chose to write that day, no fixed
structure). Treat all the given entries as ONE combined source: consolidate overlapping or related points across
days into fewer, better questions rather than producing a separate card per day. Produce 3-6 flashcards grounded
only in what's written — do not invent facts. Mix two kinds:
- "single": a recall question with a short answer, using "front" and "back".
- "multiple": a multiple-choice question, using "front", 2-4 "options", and "correct_options" (array of correct
  option indices, 0-based).

Respond with EXACTLY ONE JSON object, no prose outside it:
{"cards":[{"question_type":"single","front":"string","back":"string"},{"question_type":"multiple","front":"string","options":["string"],"correct_options":[0]}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { profileId, noteIds } = (await req.json()) as { profileId: string; noteIds: string[] };
    if (!profileId || !Array.isArray(noteIds) || noteIds.length === 0) {
      throw new Error('profileId and a non-empty noteIds array are required');
    }

    const admin = createAdminClient();

    const { data: notes, error: notesError } = await admin
      .from('notes')
      .select('date, content')
      .eq('profile_id', profileId)
      .in('id', noteIds)
      .order('date', { ascending: true });
    if (notesError) throw notesError;
    if (!notes || notes.length === 0) throw new Error('No matching notes found');

    const combinedInput = notes.map((n) => `## ${n.date}\n${n.content}`).join('\n\n');

    const messages: GeminiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: combinedInput },
    ];

    const result = await callGeminiJSON<{ cards: GeneratedCard[] }>(messages);

    const cardRows = (result.cards ?? []).map((c) => ({
      profile_id: profileId,
      front: c.front,
      back: c.question_type === 'single' ? c.back : '',
      source_type: 'note',
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

    return new Response(JSON.stringify({ added: cardRows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
