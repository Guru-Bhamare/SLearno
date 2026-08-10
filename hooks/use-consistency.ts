import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

const DAYS_BACK = 34; // 5 weeks incl. today

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function useConsistencyLog(profileId: string | undefined) {
  return useQuery({
    queryKey: ['consistency_log', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consistency_log')
        .select('date, completed')
        .eq('profile_id', profileId as string)
        .gte('date', isoDaysAgo(DAYS_BACK));
      if (error) throw error;

      const byDate = new Map(data.map((row) => [row.date, row.completed]));
      return Array.from({ length: DAYS_BACK + 1 }, (_, i) => {
        const date = isoDaysAgo(DAYS_BACK - i);
        return { date, completed: byDate.get(date) ?? false };
      });
    },
    enabled: !!profileId,
  });
}

export function useStreak(profileId: string | undefined) {
  return useQuery({
    queryKey: ['streak', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_active_date')
        .eq('profile_id', profileId as string)
        .maybeSingle();
      if (error) throw error;
      return data ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
    },
    enabled: !!profileId,
  });
}

const JOURNEY_WINDOW_DAYS = 10;

/**
 * "Now" vs "10 days ago" activity comparison, plus an all-time active-day count —
 * powers the Journey tab's then/now cards.
 */
export function useJourneyStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['journey_stats', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consistency_log')
        .select('date, completed')
        .eq('profile_id', profileId as string)
        .gte('date', isoDaysAgo(2 * JOURNEY_WINDOW_DAYS - 1));
      if (error) throw error;

      const byDate = new Map(data.map((row) => [row.date, row.completed]));
      const activeInWindow = (offsetStart: number) =>
        Array.from({ length: JOURNEY_WINDOW_DAYS }, (_, i) => byDate.get(isoDaysAgo(offsetStart + i)) ?? false)
          .filter(Boolean).length;

      const { count: allTimeActiveDays, error: countError } = await supabase
        .from('consistency_log')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId as string)
        .eq('completed', true);
      if (countError) throw countError;

      return {
        recentActiveDays: activeInWindow(0), // today back through 9 days ago
        priorActiveDays: activeInWindow(JOURNEY_WINDOW_DAYS), // 10-19 days ago
        allTimeActiveDays: allTimeActiveDays ?? 0,
        windowSize: JOURNEY_WINDOW_DAYS,
      };
    },
    enabled: !!profileId,
  });
}
