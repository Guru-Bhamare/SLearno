import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createFlashcard } from '@/lib/flashcards';
import { markTodayActive } from '@/lib/streak';
import { supabase } from '@/lib/supabase';
import { triggerProgressAnalysis } from '@/lib/trigger-analysis';

export type RoutineTask = {
  id: string;
  title: string;
  skill_area: string;
  time_block: 'morning' | 'commute' | 'evening';
  status: 'pending' | 'done' | 'deferred';
  is_compressed: boolean;
  scheduled_for: string;
  task_type: 'daily' | 'skill';
  source: 'user' | 'ai';
  start_time: string | null;
  duration_min: number;
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const FALLBACK_START_TIME: Record<RoutineTask['time_block'], string> = {
  morning: '09:00',
  commute: '13:00',
  evening: '19:00',
};

/** Real start_time if set, otherwise a fallback derived from the time_block bucket. */
export function effectiveStartTime(task: Pick<RoutineTask, 'start_time' | 'time_block'>) {
  return task.start_time ?? FALLBACK_START_TIME[task.time_block];
}

function deriveTimeBlock(startTime: string): RoutineTask['time_block'] {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'commute';
  return 'evening';
}

export function useTodayTasks(profileId: string | undefined) {
  return useTasksForDate(profileId, todayISO());
}

export function useTasksForDate(profileId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['routine_tasks', profileId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('profile_id', profileId as string)
        .eq('scheduled_for', date)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as RoutineTask[];
    },
    enabled: !!profileId,
  });
}

export function useAddTask(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      skillArea,
      taskType,
      scheduledFor,
      startTime,
      durationMin,
    }: {
      title: string;
      skillArea?: string;
      taskType: 'daily' | 'skill';
      scheduledFor: string;
      startTime: string;
      durationMin: number;
    }) => {
      if (!profileId) throw new Error('profileId is required');
      const { error } = await supabase.from('routine_tasks').insert({
        profile_id: profileId,
        title,
        skill_area: taskType === 'skill' ? skillArea || 'general' : 'general',
        task_type: taskType,
        source: 'user',
        scheduled_for: scheduledFor,
        start_time: startTime,
        duration_min: durationMin,
        time_block: deriveTimeBlock(startTime),
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId, variables.scheduledFor] });
    },
  });
}

export function useDeleteTask(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string; scheduledFor: string }) => {
      const { error } = await supabase.from('routine_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId, variables.scheduledFor] });
    },
  });
}

export function useUpdateTaskTime(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      startTime,
      durationMin,
    }: {
      taskId: string;
      scheduledFor: string;
      startTime: string;
      durationMin: number;
    }) => {
      const { error } = await supabase
        .from('routine_tasks')
        .update({ start_time: startTime, duration_min: durationMin, time_block: deriveTimeBlock(startTime) })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId, variables.scheduledFor] });
    },
  });
}

export function useSetTaskStatus(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      title,
      skillArea,
    }: {
      taskId: string;
      status: 'done' | 'deferred' | 'pending';
      title?: string;
      skillArea?: string;
    }) => {
      const { error } = await supabase.from('routine_tasks').update({ status }).eq('id', taskId);
      if (error) throw error;

      // Fire-and-forget: these enrich streak/flashcard state but shouldn't hold up
      // the checkbox responding, and a failure here shouldn't roll back the status change.
      if (status === 'done' && profileId) {
        markTodayActive(profileId).catch(() => {});
        if (title && skillArea) {
          createFlashcard(profileId, `What did you do for: ${title}?`, `Skill area: ${skillArea}`, 'task').catch(
            () => {}
          );
        }
      }
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['routine_tasks', profileId] });
      const previous = queryClient.getQueriesData<RoutineTask[]>({ queryKey: ['routine_tasks', profileId] });
      queryClient.setQueriesData<RoutineTask[]>({ queryKey: ['routine_tasks', profileId] }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streak', profileId] });
      queryClient.invalidateQueries({ queryKey: ['consistency_log', profileId] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', profileId] });
      if (profileId) triggerProgressAnalysis(profileId, 'task_status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['routine_tasks', profileId] });
    },
  });
}
