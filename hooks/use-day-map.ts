import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type DayBlock = {
  id: string;
  profile_id: string;
  date: string;
  start_time: string;
  end_time: string;
  block_type: 'work' | 'free';
};

export function useDayBlocks(profileId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['day_blocks', profileId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_blocks')
        .select('*')
        .eq('profile_id', profileId as string)
        .eq('date', date)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as DayBlock[];
    },
    enabled: !!profileId,
  });
}

export function useAddDayBlock(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      startTime,
      endTime,
      blockType,
    }: {
      date: string;
      startTime: string;
      endTime: string;
      blockType: 'work' | 'free';
    }) => {
      if (!profileId) throw new Error('profileId is required');
      const { error } = await supabase.from('day_blocks').insert({
        profile_id: profileId,
        date,
        start_time: startTime,
        end_time: endTime,
        block_type: blockType,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['day_blocks', profileId, variables.date] });
    },
  });
}

export function useDeleteDayBlock(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockId }: { blockId: string; date: string }) => {
      const { error } = await supabase.from('day_blocks').delete().eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['day_blocks', profileId, variables.date] });
    },
  });
}
