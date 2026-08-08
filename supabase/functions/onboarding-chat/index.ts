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
  const contents: { role: string; parts: unknown[] }[] = [];

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
  if (systemParts.length) {
    body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] };
  }

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

type ChatMessage = { role: 'assistant' | 'user'; content: string };

type QuestionResponse = {
  type: 'question';
  message: string;
  quick_replies?: string[];
};

type CompleteResponse = {
  type: 'complete';
  name: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  free_time_minutes: number;
  goals: string;
  interests: string[];
  learning_habits: string;
  strengths: string[];
  weaknesses: string[];
  challenges: string;
  priorities: string[];
  recommendations: string[];
  next_steps: string[];
  starter_tasks: { title: string; skill_area: string; time_block: 'morning' | 'commute' | 'evening' }[];
};

type OnboardingResult = QuestionResponse | CompleteResponse;

const SYSTEM_PROMPT = `You are onboarding a new intern into a self-learning app. Your job is to run a short, natural,
one-question-at-a-time interview to understand them, then hand back a structured summary.

Your very first question must ask what they'd like to be called (a first name or nickname is fine) — keep it
short and casual, e.g. "What should we call you?". Then cover, across the rest of the conversation: current
skill level, concrete goals, interests/topics they care about, current learning habits, how much free time they
realistically have per day, strengths, weaknesses, and specific challenges they're facing. Ask ONE question at a
time. If an answer is vague or thin, ask a natural follow-up instead of guessing — do not assume anything you
haven't been told. Keep questions short and conversational. Optionally suggest 2-4 short "quick_replies" when a
multiple-choice-style answer makes sense (e.g. skill level, free time); omit quick_replies for open-ended
questions (including the name question).

Once you have enough signal (usually after 6-10 exchanges) to build a genuinely personalized starting plan, stop
asking questions and respond with the completion object instead.

Always respond with EXACTLY ONE JSON object, no prose outside it, matching one of:

{"type":"question","message":"<next question>","quick_replies":["<option>", ...]}

{"type":"complete","name":"<what they asked to be called>","skill_level":"beginner|intermediate|advanced","free_time_minutes":<number>,"goals":"<summary>","interests":["..."],"learning_habits":"<summary>","strengths":["..."],"weaknesses":["..."],"challenges":"<summary>","priorities":["3-5 short priorities for this intern"],"recommendations":["3-5 concrete recommendations"],"next_steps":["3-5 immediate next steps"],"starter_tasks":[{"title":"...","skill_area":"...","time_block":"morning|commute|evening"}]}

starter_tasks should have 3-5 tasks, sized to the stated free time (fewer/shorter tasks if free_time_minutes < 30),
each tailored to what this specific intern told you — not generic boilerplate.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { profileId, history } = (await req.json()) as { profileId: string; history: ChatMessage[] };
    if (!profileId) throw new Error('profileId is required');

    const messages: GeminiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m): GeminiMessage => ({ role: m.role, content: m.content })),
    ];
    if (history.length === 0) {
      messages.push({ role: 'user', content: 'Begin the interview with your first question.' });
    }

    const result = await callGeminiJSON<OnboardingResult>(messages);

    if (result.type === 'complete') {
      const admin = createAdminClient();

      const { error: profileError } = await admin.from('profiles').upsert({
        id: profileId,
        name: result.name,
        skill_level: result.skill_level,
        free_time_minutes: result.free_time_minutes,
        goals: result.goals,
        interests: result.interests,
        learning_habits: result.learning_habits,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        challenges: result.challenges,
      });
      if (profileError) throw profileError;

      if (result.starter_tasks?.length) {
        const { error: tasksError } = await admin.from('routine_tasks').insert(
          result.starter_tasks.map((t) => ({
            profile_id: profileId,
            title: t.title,
            skill_area: t.skill_area,
            time_block: t.time_block,
            is_compressed: result.free_time_minutes < 30,
          }))
        );
        if (tasksError) throw tasksError;
      }

      const { error: streakError } = await admin
        .from('streaks')
        .upsert({ profile_id: profileId, current_streak: 0, longest_streak: 0 }, { onConflict: 'profile_id' });
      if (streakError) throw streakError;

      const { error: analysisError } = await admin.from('profile_analysis').insert({
        profile_id: profileId,
        trigger: 'onboarding',
        priorities: result.priorities,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        next_steps: result.next_steps,
        raw: result,
      });
      if (analysisError) throw analysisError;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
