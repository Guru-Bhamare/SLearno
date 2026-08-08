import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { nextCardState } from '@/lib/flashcard-scheduler';
import { supabase } from '@/lib/supabase';

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  source_type: string;
  question_type: 'single' | 'multiple';
  options: string[] | null;
  correct_options: number[] | null;
  interval_stage: number;
  next_due_at: string;
};

const DAILY_DECK_SIZE = 5;

export function useDueFlashcards(profileId: string | undefined) {
  return useQuery({
    queryKey: ['flashcards', profileId, 'due'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('profile_id', profileId as string)
        .lte('next_due_at', new Date().toISOString())
        .order('next_due_at', { ascending: true })
        .limit(DAILY_DECK_SIZE);
      if (error) throw error;
      return data as Flashcard[];
    },
    enabled: !!profileId,
  });
}

export function useAnswerFlashcard(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ card, correct }: { card: Flashcard; correct: boolean }) => {
      const { nextStage, dueAt } = nextCardState(card.interval_stage, correct);
      const { error } = await supabase
        .from('flashcards')
        .update({
          interval_stage: nextStage,
          next_due_at: dueAt.toISOString(),
          last_result: correct ? 'correct' : 'incorrect',
        })
        .eq('id', card.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] }),
  });
}

export function useUploadHomework(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      fileUri,
      contentType,
    }: {
      resourceId: string | null;
      fileUri: string;
      contentType: string;
    }) => {
      if (!profileId) throw new Error('profileId is required');

      const ext = contentType === 'image/png' ? 'png' : 'jpg';
      const imagePath = `${profileId}/${Date.now()}.${ext}`;
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('homework')
        .upload(imagePath, arrayBuffer, { contentType });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke('generate-homework-flashcards', {
        body: { profileId, resourceId, imagePath },
      });
      if (error) throw error;
      return data as { added: number; extracted_summary: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] }),
  });
}
