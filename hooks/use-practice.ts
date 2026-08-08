import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pickPartner, pickPrompt } from '@/lib/practice-partners';
import { supabase } from '@/lib/supabase';

export type PracticeSession = {
  id: string;
  partner_label: string;
  scheduled_for: string;
  duration_min: number;
  prompt: string | null;
};

const RECENT_WINDOW = 3;

export function usePracticeSessions(profileId: string | undefined) {
  return useQuery({
    queryKey: ['practice_sessions', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('profile_id', profileId as string)
        .order('scheduled_for', { ascending: false });
      if (error) throw error;
      return data as PracticeSession[];
    },
    enabled: !!profileId,
  });
}

export function useMatchPartner(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('No profile yet');

      const { data: recent } = await supabase
        .from('practice_sessions')
        .select('partner_label')
        .eq('profile_id', profileId)
        .order('scheduled_for', { ascending: false })
        .limit(RECENT_WINDOW);

      const partner = pickPartner((recent ?? []).map((r) => r.partner_label));
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 5);

      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          profile_id: profileId,
          partner_label: partner,
          scheduled_for: scheduledFor.toISOString(),
          duration_min: 10,
          prompt: pickPrompt(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as PracticeSession;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice_sessions', profileId] }),
  });
}
