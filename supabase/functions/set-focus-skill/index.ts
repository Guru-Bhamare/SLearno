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

type RewrittenTask = { id: string; title: string; skill_area: string };
type StarterCard = { front: string; back: string };

const SYSTEM_PROMPT = `You are an adaptive learning coach for an intern self-learning app. The intern just picked a
new skill/resource to focus on. You are given that resource plus their currently pending routine tasks (each with
an id, title, skill_area, and time_block). Rewrite each task's title (and skill_area) so it targets the new skill,
while keeping the SAME number of tasks and the same time_block slots — you are re-purposing existing slots, not
adding or removing them. Also produce 2-3 short starter flashcards (front/back) to kick off recall practice for the
new skill.

Respond with EXACTLY ONE JSON object, no prose outside it:
{"tasks":[{"id":"same id as given","title":"string","skill_area":"string"}],"starter_cards":[{"front":"string","back":"string"}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { profileId, resourceId } = (await req.json()) as { profileId: string; resourceId: string };
    if (!profileId || !resourceId) throw new Error('profileId and resourceId are required');

    const admin = createAdminClient();

    const [{ data: resource, error: resourceError }, { data: pendingTasks, error: tasksError }] = await Promise.all([
      admin.from('resources').select('*').eq('id', resourceId).single(),
      admin
        .from('routine_tasks')
        .select('id, title, skill_area, time_block, scheduled_for')
        .eq('profile_id', profileId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true }),
    ]);
    if (resourceError) throw resourceError;
    if (tasksError) throw tasksError;

    const messages: GeminiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({ resource, pending_tasks: pendingTasks ?? [] }),
      },
    ];

    const result = await callGeminiJSON<{ tasks: RewrittenTask[]; starter_cards: StarterCard[] }>(messages);

    await Promise.all(
      (result.tasks ?? []).map((t) =>
        admin.from('routine_tasks').update({ title: t.title, skill_area: t.skill_area }).eq('id', t.id).eq('profile_id', profileId)
      )
    );

    const { error: profileError } = await admin
      .from('profiles')
      .update({ focus_skill: resource.skill_area, focus_resource_id: resource.id })
      .eq('id', profileId);
    if (profileError) throw profileError;

    const starterRows = (result.starter_cards ?? []).map((c) => ({
      profile_id: profileId,
      front: c.front,
      back: c.back,
      source_type: 'task',
      question_type: 'single',
      interval_stage: 0,
      next_due_at: new Date().toISOString(),
    }));
    if (starterRows.length > 0) {
      const { error: cardsError } = await admin.from('flashcards').insert(starterRows);
      if (cardsError) throw cardsError;
    }

    return new Response(JSON.stringify({ focus_skill: resource.skill_area, focus_resource_id: resource.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
