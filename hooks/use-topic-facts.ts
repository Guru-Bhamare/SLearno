import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useGenerateTopicFacts() {
  return useMutation({
    mutationFn: async (topic: string) => {
      const { data, error } = await supabase.functions.invoke('generate-topic-facts', {
        body: { topic },
      });
      if (error) throw error;
      const facts = (data?.facts ?? []) as string[];
      if (facts.length === 0) throw new Error('No facts found for that topic — try rephrasing it.');
      return facts;
    },
  });
}
