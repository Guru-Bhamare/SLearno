import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export type Note = {
  id: string;
  profile_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function useNotes(profileId: string | undefined) {
  return useQuery({
    queryKey: ['notes', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('profile_id', profileId as string)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!profileId,
  });
}

export function useUpsertTodayNote(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!profileId) throw new Error('No profile yet');
      const { error } = await supabase
        .from('notes')
        .upsert(
          { profile_id: profileId, date: todayDate(), content, updated_at: new Date().toISOString() },
          { onConflict: 'profile_id,date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', profileId] });
      if (profileId) triggerProgressAnalysis(profileId, 'note');
    },
  });
}

export function useGenerateFlashcardsFromNotes(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteIds: string[]) => {
      if (!profileId) throw new Error('No profile yet');
      const { data, error } = await supabase.functions.invoke('generate-notes-flashcards', {
        body: { profileId, noteIds },
      });
      if (error) throw error;
      return data as { added: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] }),
  });
}
