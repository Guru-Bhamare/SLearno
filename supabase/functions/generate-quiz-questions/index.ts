// NOTE: self-contained (no `../_shared/*` imports) — the Supabase MCP
// deploy_edge_function tool fails to bundle relative cross-file imports;
// see CLAUDE.md. Duplicates cors/gemini/admin-client helpers inline.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-flash-latest';
const CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type GeminiMessage = { role: 'system' | 'user'; content: string };

async function callGeminiJSON<T>(messages: GeminiMessage[]): Promise<T> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

  const systemParts: string[] = [];
  const contents: { role: string; parts: unknown[] }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
      continue;
    }
    contents.push({ role: 'user', parts: [{ text: m.content }] });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
  };
  if (systemParts.length) body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] };

  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
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

type QuizQuestion = { question: string; options: string[]; correct_option: number };

const SYSTEM_PROMPT = `You generate multiple-choice quiz questions for a short, timed quiz game between interns
at a company. You are given a topic and an exact number of questions to produce.

Each question must have 2-4 short answer options and exactly one correct option (0-indexed).
Questions should be clear, unambiguous, and answerable in a few seconds each — this is a speed round.

Respond with EXACTLY ONE JSON object, no prose outside it:
{"questions":[{"question":"...","options":["...","..."],"correct_option":0}, ...]}

Produce exactly the requested number of questions.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, cardCount } = (await req.json()) as { topic: string; cardCount: number };
    if (!topic?.trim()) throw new Error('topic is required');
    if (!cardCount || cardCount < 1 || cardCount > 20) throw new Error('cardCount must be between 1 and 20');

    const admin = createAdminClient();
    const normalizedTopic = topic.trim().toLowerCase();

    const { data: cached } = await admin
      .from('quiz_question_cache')
      .select('questions, created_at')
      .ilike('topic', normalizedTopic)
      .eq('card_count', cardCount)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_MAX_AGE_MS) {
      return new Response(JSON.stringify({ questions: cached.questions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await callGeminiJSON<{ questions: QuizQuestion[] }>([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Topic: ${topic.trim()}\nNumber of questions: ${cardCount}` },
    ]);

    if (!Array.isArray(result.questions) || result.questions.length === 0) {
      throw new Error('Gemini returned no questions');
    }

    await admin.from('quiz_question_cache').insert({
      topic: normalizedTopic,
      card_count: cardCount,
      questions: result.questions,
    });

    return new Response(JSON.stringify({ questions: result.questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
