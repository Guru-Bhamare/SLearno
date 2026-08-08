import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export function useLogReflection(profileId: string | undefined) {
  return useMutation({
    mutationFn: async ({ skipped, note }: { skipped: boolean; note?: string }) => {
      if (!profileId) throw new Error('No profile yet');
      const { error } = await supabase.from('reflections').insert({
        profile_id: profileId,
        skipped,
        note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (profileId) triggerProgressAnalysis(profileId, 'reflection');
    },
  });
}
