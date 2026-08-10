import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useGenerateDailyPlan(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schedule,
      academicsGoals,
      skillsGoals,
      academicsMinutes,
      skillsMinutes,
      date,
    }: {
      schedule: string;
      academicsGoals: string;
      skillsGoals: string;
      academicsMinutes?: number;
      skillsMinutes?: number;
      date: string;
    }) => {
      if (!profileId) throw new Error('Not signed in');

      const { data, error } = await supabase.functions.invoke('generate-daily-plan', {
        body: { profileId, schedule, academicsGoals, skillsGoals, academicsMinutes, skillsMinutes, date },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as { count: number };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId, variables.date] });
    },
  });
}
