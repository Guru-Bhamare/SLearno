import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createFlashcard } from '@/lib/flashcards';
import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useTodayCuriosityLog(profileId: string | undefined) {
  return useQuery({
    queryKey: ['curiosity_logs', profileId, 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curiosity_logs')
        .select('*')
        .eq('profile_id', profileId as string)
        .gte('created_at', startOfTodayISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useSubmitCuriosityResponse(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prompt, response }: { prompt: string; response: string }) => {
      if (!profileId) throw new Error('No profile yet');
      const { error } = await supabase.from('curiosity_logs').insert({
        profile_id: profileId,
        prompt_text: prompt,
        response_text: response,
      });
      if (error) throw error;
      await createFlashcard(profileId, prompt, response, 'curiosity');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curiosity_logs', profileId] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] });
      if (profileId) triggerProgressAnalysis(profileId, 'curiosity');
    },
  });
}
