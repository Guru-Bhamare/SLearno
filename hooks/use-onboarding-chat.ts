import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'assistant' | 'user'; content: string };

export type OnboardingQuestion = {
  type: 'question';
  message: string;
  quick_replies?: string[];
};

export type OnboardingComplete = {
  type: 'complete';
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  free_time_minutes: number;
  goals: string;
  interests: string[];
  learning_habits: string;
  strengths: string[];
  weaknesses: string[];
  challenges: string;
  priorities: string[];
  recommendations: string[];
  next_steps: string[];
  starter_tasks: { title: string; skill_area: string; time_block: 'morning' | 'commute' | 'evening' }[];
};

export type OnboardingChatResult = OnboardingQuestion | OnboardingComplete;

export function useOnboardingChat() {
  return useMutation({
    mutationFn: async ({ profileId, history }: { profileId: string; history: ChatMessage[] }) => {
      const { data, error } = await supabase.functions.invoke<OnboardingChatResult>('onboarding-chat', {
        body: { profileId, history },
      });
      if (error) throw error;
      if (!data) throw new Error('onboarding-chat returned no data');
      return data;
    },
  });
}
