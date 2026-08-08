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
