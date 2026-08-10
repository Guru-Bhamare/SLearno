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
days into fewer, better questions rather than producing a separate card per day.

You are also given a list of flashcards that already exist for this intern (from notes, tasks, or other
activity). Do NOT produce any card that duplicates or closely overlaps with a card in that existing list, even if
worded differently or asked from a different angle — the intern already has that knowledge covered in their deck.
Only produce cards that test something genuinely not already covered.

Before writing cards, decide whether the notes actually contain learnable content:
- If a note (or all of the given notes) is just a log of events, a to-do list, small talk, or otherwise has no
  concrete fact, concept, or skill worth recalling, produce NO cards from it. It is completely fine to return an
  empty "cards" array — do not force cards out of content that doesn't support them.
- Never write a card whose question or answer is about WHEN something happened — no "what did you do on
  [date]", "what happened on [day]", or similar. Dates are metadata, not content to be tested. Only ask about the
  actual facts, concepts, or techniques described in the notes.
- Only produce cards grounded in what's written — do not invent facts.
- Before finalizing, drop any card that tests essentially the same fact or concept as another card in the set
  (even if worded differently) — each card must test a distinct piece of knowledge, no near-duplicates.
- Also drop any card that duplicates or closely overlaps with a card in the existing flashcards list provided
  below. It is completely fine to return an empty "cards" array if everything worth testing is already covered.

When the notes do support cards, produce 0-6 flashcards (fewer is fine; never pad with weak or repetitive
cards just to hit a count). Mix two kinds:
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

    const { data: existingCards, error: existingCardsError } = await admin
      .from('flashcards')
      .select('front, back, question_type, options')
      .eq('profile_id', profileId);
    if (existingCardsError) throw existingCardsError;

    const combinedInput = notes.map((n) => `## ${n.date}\n${n.content}`).join('\n\n');

    const existingCardsSummary =
      existingCards && existingCards.length > 0
        ? existingCards
            .map((c, i) => {
              const answer = c.question_type === 'multiple' ? (c.options ?? []).join(' / ') : c.back;
              return `${i + 1}. Q: ${c.front}\n   A: ${answer}`;
            })
            .join('\n')
        : '(none yet)';

    const messages: GeminiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `# Existing flashcards (do not duplicate)\n${existingCardsSummary}\n\n# Notes\n${combinedInput}` },
    ];

    const result = await callGeminiJSON<{ cards: GeneratedCard[] }>(messages);

    const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const existingFronts = new Set((existingCards ?? []).map((c) => normalize(c.front)));

    const cardRows = (result.cards ?? [])
      .filter((c) => !existingFronts.has(normalize(c.front)))
      .map((c) => ({
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

    let insertedCards: unknown[] = [];
    if (cardRows.length > 0) {
      const { data: inserted, error: cardsError } = await admin.from('flashcards').insert(cardRows).select();
      if (cardsError) throw cardsError;
      insertedCards = inserted ?? [];
    }

    return new Response(JSON.stringify({ added: cardRows.length, cards: insertedCards }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
