import { supabase } from '@/lib/supabase';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Marks today as completed in the consistency log and bumps the streak.
 * Idempotent for a given day — calling it multiple times the same day is a no-op
 * on the streak count itself (only the first completion of the day advances it).
 */
export async function markTodayActive(profileId: string) {
  const today = todayISO();

  const { data: existingLog } = await supabase
    .from('consistency_log')
    .select('completed')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle();

  const alreadyCompletedToday = existingLog?.completed ?? false;

  await supabase
    .from('consistency_log')
    .upsert({ profile_id: profileId, date: today, completed: true }, { onConflict: 'profile_id,date' });

  if (alreadyCompletedToday) return;

  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_active_date')
    .eq('profile_id', profileId)
    .maybeSingle();

  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const lastActive = streak?.last_active_date;

  const nextCurrent = lastActive === yesterdayISO() ? current + 1 : 1;
  const nextLongest = Math.max(longest, nextCurrent);

  await supabase.from('streaks').upsert(
    {
      profile_id: profileId,
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      last_active_date: today,
    },
    { onConflict: 'profile_id' }
  );
}
