import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export type Resource = {
  id: string;
  title: string;
  skill_area: string;
  source_tag: string;
  url: string | null;
  usage_count: number;
  linked_task_id: string | null;
};

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('*').order('title');
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Resource;
    },
    enabled: !!id,
  });
}

export function useIncrementResourceUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentUsage }: { id: string; currentUsage: number }) => {
      const { error } = await supabase.from('resources').update({ usage_count: currentUsage + 1 }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['resource', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useSuggestResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, query }: { profileId: string; query: string }) => {
      const { data, error } = await supabase.functions.invoke('suggest-resources', {
        body: { profileId, query },
      });
      if (error) throw error;
      return (data?.resources ?? []) as Resource[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useSetFocusSkill(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId }: { resourceId: string }) => {
      if (!profileId) throw new Error('profileId is required');
      const { data, error } = await supabase.functions.invoke('set-focus-skill', {
        body: { profileId, resourceId },
      });
      if (error) throw error;
      return data as { focus_skill: string; focus_resource_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] });
      queryClient.invalidateQueries({ queryKey: ['profile_analysis', profileId] });
      if (profileId) triggerProgressAnalysis(profileId, 'skill_switch');
    },
  });
}

export function useResourcesForTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['resources', 'task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('*').eq('linked_task_id', taskId as string);
      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!taskId,
  });
}
