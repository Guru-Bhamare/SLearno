// NOTE: self-contained (no `../_shared/*` imports) — the Supabase MCP
// deploy_edge_function tool fails to bundle relative cross-file imports;
// see CLAUDE.md. Duplicates cors/gemini helpers inline.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-flash-latest';

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
    generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
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

const SYSTEM_PROMPT = `You generate short, interesting facts for an intern's quick self-learning break at work.
Given a topic, produce a set of standalone facts about it — each one understandable on its own, without needing
the others for context. Keep each fact to 1-2 short sentences, specific and concrete rather than generic ("Python
was released in 1991 by Guido van Rossum" beats "Python is a popular programming language"). Vary what each fact
covers (history, how it works, a surprising detail, a common misconception, a practical tip) so the set doesn't
repeat itself. If the topic is inappropriate, nonsensical, or too sparse to produce real facts about, return an
empty facts array instead of inventing filler.

Respond with EXACTLY ONE JSON object, no prose outside it:
{"facts":["...", "..."]}

Produce exactly the requested number of facts, in an order that reads well front-to-back (roughly simple/foundational first).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, factCount } = (await req.json()) as { topic: string; factCount?: number };
    if (!topic?.trim()) throw new Error('topic is required');
    const count = factCount && factCount > 0 && factCount <= 10 ? factCount : 6;

    const result = await callGeminiJSON<{ facts: string[] }>([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Topic: ${topic.trim()}\nNumber of facts: ${count}` },
    ]);

    const facts = (result.facts ?? []).filter((f) => typeof f === 'string' && f.trim().length > 0);
    if (facts.length === 0) throw new Error('No facts found for that topic — try rephrasing it.');

    return new Response(JSON.stringify({ facts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
