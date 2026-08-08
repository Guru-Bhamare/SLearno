import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type ProfileAnalysis = {
  id: string;
  trigger: string;
  priorities: string[];
  weaknesses: string[];
  recommendations: string[];
  next_steps: string[];
  actions_taken: string[];
  created_at: string;
};

export function useProfileAnalysis(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile_analysis', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_analysis')
        .select('id, trigger, priorities, weaknesses, recommendations, next_steps, actions_taken, created_at')
        .eq('profile_id', profileId as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileAnalysis | null;
    },
    enabled: !!profileId,
  });
}
