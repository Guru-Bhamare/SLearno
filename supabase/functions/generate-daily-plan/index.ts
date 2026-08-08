// NOTE: self-contained — see CLAUDE.md re: Supabase MCP deploy bundling.

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
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

function deriveTimeBlock(startTime: string): 'morning' | 'commute' | 'evening' {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'commute';
  return 'evening';
}

type PlanTask = {
  title: string;
  category: 'academics' | 'skills';
  start_time: string;
  duration_min: number;
  skill_area: string;
};

type PlanResult = { tasks: PlanTask[] };

const SYSTEM_PROMPT = `You are a daily planning assistant for an intern self-learning app. The user has already
decided which items are academics vs additional skills — they provided two separate lists. Your job is ONLY to
turn those lists into a realistic timed schedule. Do NOT move items between categories or invent new goals.

Rules:
- Tasks from the "Academics" list MUST have category "academics". Tasks from the "Additional skills" list MUST
  have category "skills". Never reassign or guess.
- Create 1 timed task per distinct item the user listed (split large items into sub-tasks only if clearly needed).
- Each task needs a concrete actionable title based on what the user wrote.
- Assign start_time in 24h HH:MM format, respecting the time schedule — never overlap fixed commitments.
- duration_min: 15–90 minutes, realistic for the task.
- skill_area: short label inferred from the item, e.g. "Mathematics", "Physics", "Guitar".
- Spread tasks across free windows; leave small breaks between blocks.
- If one list is empty, return tasks only for the non-empty list.

Respond with EXACTLY ONE JSON object, no prose:
{"tasks":[{"title":"string","category":"academics|skills","start_time":"HH:MM","duration_min":number,"skill_area":"string"}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as {
      profileId: string;
      schedule: string;
      academicsGoals?: string;
      skillsGoals?: string;
      date: string;
      goals?: string;
    };

    const { profileId, schedule, academicsGoals, skillsGoals, date, goals: legacyGoalsRaw } = body;

    if (!profileId) throw new Error('profileId is required');
    if (!schedule?.trim()) throw new Error('schedule is required');
    if (!date) throw new Error('date is required');

    const academics = (academicsGoals ?? '').trim();
    const skills = (skillsGoals ?? '').trim();
    const legacyGoals = legacyGoalsRaw?.trim() ?? '';
    const hasAcademicsOrSkills = academics.length > 0 || skills.length > 0;
    if (!hasAcademicsOrSkills && !legacyGoals) {
      throw new Error('Add at least one item under Academics or Additional skills');
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('*').eq('id', profileId).maybeSingle();

    const userContent = [
      profile
        ? `Intern profile: name=${profile.name ?? 'unknown'}, skill_level=${profile.skill_level}, free_time_minutes=${profile.free_time_minutes}, focus_skill=${profile.focus_skill ?? 'none'}`
        : '',
      `Date: ${date}`,
      `Time schedule:\n${schedule.trim()}`,
      academics ? `Academics (user chose these — category MUST be "academics"):\n${academics}` : '',
      skills ? `Additional skills (user chose these — category MUST be "skills"):\n${skills}` : '',
      !hasAcademicsOrSkills && legacyGoals ? `Things to do today:\n${legacyGoals}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const plan = await callGeminiJSON<PlanResult>([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]);

    if (!plan.tasks?.length) throw new Error('Gemini returned no tasks');

    // Enforce user-chosen categories — strip any task Gemini miscategorized
    const filtered = plan.tasks.filter((t) => {
      if (t.category === 'academics') return academics.length > 0;
      if (t.category === 'skills') return skills.length > 0;
      return false;
    });

    if (!filtered.length) throw new Error('No tasks matched your lists');

    await admin
      .from('routine_tasks')
      .delete()
      .eq('profile_id', profileId)
      .eq('scheduled_for', date)
      .eq('status', 'pending');

    const rows = filtered.map((t) => ({
      profile_id: profileId,
      title: t.title,
      skill_area: t.skill_area || (t.category === 'academics' ? 'Academics' : 'Skills'),
      task_type: t.category === 'academics' ? 'daily' : 'skill',
      source: 'ai',
      scheduled_for: date,
      start_time: t.start_time,
      duration_min: t.duration_min,
      time_block: deriveTimeBlock(t.start_time),
      status: 'pending',
    }));

    const { error: insertError } = await admin.from('routine_tasks').insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ tasks: filtered, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
