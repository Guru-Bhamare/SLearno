import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useGenerateDailyPlan(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schedule,
      academicsGoals,
      skillsGoals,
      date,
    }: {
      schedule: string;
      academicsGoals: string;
      skillsGoals: string;
      date: string;
    }) => {
      if (!profileId) throw new Error('Not signed in');

      const { data, error } = await supabase.functions.invoke('generate-daily-plan', {
        body: { profileId, schedule, academicsGoals, skillsGoals, date },
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
