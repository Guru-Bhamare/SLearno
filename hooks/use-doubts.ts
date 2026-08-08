import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMockAnswer } from '@/lib/doubt-helper';
import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export type Doubt = {
  id: string;
  question: string;
  is_anonymous: boolean;
  status: string;
  mock_answer: string | null;
  created_at: string;
};

export function useDoubts(profileId: string | undefined) {
  return useQuery({
    queryKey: ['doubts', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doubts')
        .select('*')
        .eq('profile_id', profileId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Doubt[];
    },
    enabled: !!profileId,
  });
}

export function useAskDoubt(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ question, isAnonymous }: { question: string; isAnonymous: boolean }) => {
      if (!profileId) throw new Error('No profile yet');
      const { error } = await supabase.from('doubts').insert({
        profile_id: profileId,
        question,
        is_anonymous: isAnonymous,
        status: 'answered',
        mock_answer: getMockAnswer(question),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doubts', profileId] });
      if (profileId) triggerProgressAnalysis(profileId, 'doubt');
    },
  });
}
