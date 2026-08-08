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

type ActionTask = {
  title: string;
  skill_area: string;
  time_block: 'morning' | 'commute' | 'evening';
  start_time?: string;
};

type AnalysisResult = {
  priorities: string[];
  weaknesses: string[];
  recommendations: string[];
  next_steps: string[];
  actions: ActionTask[];
};

const SYSTEM_PROMPT = `You are an adaptive learning coach for an intern self-learning app. You will be given an
intern's profile (skill level, goals, interests, habits, strengths/weaknesses/challenges they told us during
onboarding) plus a snapshot of their recent activity (routine task completions/deferrals, notes, doubts asked,
curiosity responses, reflections, current streak). Identify what's actually going on — e.g. repeated deferrals in
one skill area, doubts clustering on a topic, a dropping streak, growing confidence in an area — and update their
plan accordingly. Be specific and concrete, grounded only in what's given; do not invent facts.

This app does not show interns advice text to act on later — instead of telling them what they should do, you
directly produce 2-3 concrete new routine tasks ("actions") that address the weaknesses/priorities you found; the
app inserts these into their routine automatically. Each action needs a short actionable title (an intern can just
do it, not "review X" vagueness), a skill_area, and a time_block ("morning", "commute", or "evening").

You may also be given the intern's free time blocks for tomorrow (start/end in HH:MM, 24h). If any free blocks are
given, pick ONE of them per action and set "start_time" to a HH:MM time that falls inside that block's
start–end range — this is how the action gets slotted into their day. If no free blocks are given, omit
"start_time" entirely.

Respond with EXACTLY ONE JSON object, no prose outside it:
{"priorities":["3-5 short current priorities"],"weaknesses":["current weak spots, may differ from onboarding"],"recommendations":["3-5 concrete recommendations"],"next_steps":["3-5 immediate next steps"],"actions":[{"title":"string","skill_area":"string","time_block":"morning|commute|evening","start_time":"HH:MM (optional, only if free blocks were given)"}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { profileId, trigger } = (await req.json()) as { profileId: string; trigger: string };
    if (!profileId) throw new Error('profileId is required');

    const admin = createAdminClient();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledFor = tomorrow.toISOString().slice(0, 10);

    const [{ data: profile }, { data: tasks }, { data: notes }, { data: doubts }, { data: curiosity }, { data: reflections }, { data: streak }, { data: freeBlocks }] =
      await Promise.all([
        admin.from('profiles').select('*').eq('id', profileId).maybeSingle(),
        admin.from('routine_tasks').select('title, skill_area, status, scheduled_for').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(20),
        admin.from('notes').select('date, content').eq('profile_id', profileId).order('date', { ascending: false }).limit(10),
        admin.from('doubts').select('question, created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(10),
        admin.from('curiosity_logs').select('prompt_text, response_text, created_at').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(10),
        admin.from('reflections').select('skipped, note, date').eq('profile_id', profileId).order('date', { ascending: false }).limit(10),
        admin.from('streaks').select('current_streak, longest_streak, last_active_date').eq('profile_id', profileId).maybeSingle(),
        admin
          .from('day_blocks')
          .select('start_time, end_time')
          .eq('profile_id', profileId)
          .eq('date', scheduledFor)
          .eq('block_type', 'free')
          .order('start_time', { ascending: true }),
      ]);

    const context = {
      trigger,
      profile,
      recent_tasks: tasks,
      recent_notes: notes,
      recent_doubts: doubts,
      recent_curiosity: curiosity,
      recent_reflections: reflections,
      streak,
      tomorrow_free_blocks: freeBlocks,
    };

    const messages: GeminiMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(context) },
    ];

    const result = await callGeminiJSON<AnalysisResult>(messages);

    const freeBlockRanges = (freeBlocks ?? []) as { start_time: string; end_time: string }[];

    const actionRows = (result.actions ?? []).map((a) => {
      const startTime = a.start_time && /^\d{2}:\d{2}/.test(a.start_time) ? a.start_time.slice(0, 5) : null;
      const matchingBlock = startTime
        ? freeBlockRanges.find((b) => startTime >= b.start_time.slice(0, 5) && startTime <= b.end_time.slice(0, 5))
        : null;
      const durationMin = matchingBlock
        ? Math.min(
            30,
            (Number(matchingBlock.end_time.slice(0, 2)) * 60 + Number(matchingBlock.end_time.slice(3, 5))) -
              (Number(startTime!.slice(0, 2)) * 60 + Number(startTime!.slice(3, 5)))
          )
        : 20;

      return {
        profile_id: profileId,
        title: a.title,
        skill_area: a.skill_area,
        time_block: a.time_block,
        start_time: matchingBlock ? startTime : null,
        duration_min: durationMin > 0 ? durationMin : 20,
        task_type: 'skill',
        source: 'ai',
        scheduled_for: scheduledFor,
        status: 'pending',
      };
    });
    if (actionRows.length > 0) {
      const { error: actionsError } = await admin.from('routine_tasks').insert(actionRows);
      if (actionsError) throw actionsError;
    }
    const actionsTaken = actionRows.map((a) => a.title);

    const { data: inserted, error: insertError } = await admin
      .from('profile_analysis')
      .insert({
        profile_id: profileId,
        trigger,
        priorities: result.priorities,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        next_steps: result.next_steps,
        actions_taken: actionsTaken,
        raw: result,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
