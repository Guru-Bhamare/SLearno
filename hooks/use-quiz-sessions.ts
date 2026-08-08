import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { JOIN_WINDOW_SECONDS, STALE_SESSION_MINUTES, type QuizAnswerLog, type QuizQuestion } from '@/lib/quiz';

export type QuizSession = {
  id: string;
  host_profile_id: string;
  topic: string;
  card_count: number;
  status: 'open' | 'active' | 'finished';
  starts_at: string;
  questions: QuizQuestion[];
  created_at: string;
};

export type QuizParticipant = {
  id: string;
  session_id: string;
  profile_id: string;
  name: string;
  correct_count: number;
  finished_at: string | null;
  answers: QuizAnswerLog[];
};

function staleCutoffISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - STALE_SESSION_MINUTES);
  return d.toISOString();
}

/** Subscribes to postgres_changes for a table and invalidates the given query key on any event. */
function useRealtimeInvalidate(channelName: string, table: string, filter: string | undefined, queryKey: unknown[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter]);
}

export function useOpenQuizSessions() {
  useRealtimeInvalidate('quiz_sessions_list', 'quiz_sessions', undefined, ['quiz_sessions', 'open']);

  return useQuery({
    queryKey: ['quiz_sessions', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .in('status', ['open', 'active'])
        .gte('created_at', staleCutoffISO())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as QuizSession[];
    },
    refetchInterval: 5000,
  });
}

export function useQuizSession(sessionId: string | undefined) {
  useRealtimeInvalidate(
    `quiz_session_${sessionId}`,
    'quiz_sessions',
    sessionId ? `id=eq.${sessionId}` : undefined,
    ['quiz_sessions', sessionId]
  );
  useRealtimeInvalidate(
    `quiz_participants_${sessionId}`,
    'quiz_participants',
    sessionId ? `session_id=eq.${sessionId}` : undefined,
    ['quiz_participants', sessionId]
  );

  const sessionQuery = useQuery({
    queryKey: ['quiz_sessions', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId as string).single();
      if (error) throw error;
      return data as QuizSession;
    },
    enabled: !!sessionId,
    refetchInterval: 3000,
  });

  const participantsQuery = useQuery({
    queryKey: ['quiz_participants', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('session_id', sessionId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as QuizParticipant[];
    },
    enabled: !!sessionId,
    refetchInterval: 3000,
  });

  return { session: sessionQuery, participants: participantsQuery };
}

export function useCreateQuizSession(profileId: string | undefined, name: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ topic, cardCount }: { topic: string; cardCount: number }) => {
      if (!profileId) throw new Error('No profile yet');
      if (!name) throw new Error('Name is required to host a speed round');

      const { data: genData, error: genError } = await supabase.functions.invoke('generate-quiz-questions', {
        body: { topic, cardCount },
      });
      if (genError) throw genError;
      const questions = genData.questions as QuizQuestion[];

      const startsAt = new Date();
      startsAt.setSeconds(startsAt.getSeconds() + JOIN_WINDOW_SECONDS);

      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          host_profile_id: profileId,
          topic,
          card_count: cardCount,
          status: 'open',
          starts_at: startsAt.toISOString(),
          questions,
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const { error: joinError } = await supabase
        .from('quiz_participants')
        .insert({ session_id: session.id, profile_id: profileId, name });
      if (joinError) throw joinError;

      return session as QuizSession;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiz_sessions'] }),
  });
}

export function useJoinQuizSession(profileId: string | undefined, name: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!profileId) throw new Error('No profile yet');
      if (!name) throw new Error('Name is required to join a speed round');

      const { error } = await supabase
        .from('quiz_participants')
        .upsert({ session_id: sessionId, profile_id: profileId, name }, { onConflict: 'session_id,profile_id' });
      if (error) throw error;
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['quiz_participants', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['quiz_sessions'] });
    },
  });
}

export function useSubmitAnswer(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      participant,
      index,
      correct,
      isLast,
    }: {
      sessionId: string;
      participant: QuizParticipant;
      index: number;
      correct: boolean;
      isLast: boolean;
    }) => {
      if (!profileId) throw new Error('No profile yet');

      const answers: QuizAnswerLog[] = [...participant.answers, { index, correct, answered_at: new Date().toISOString() }];
      const { error } = await supabase
        .from('quiz_participants')
        .update({
          answers,
          correct_count: participant.correct_count + (correct ? 1 : 0),
          finished_at: isLast ? new Date().toISOString() : null,
        })
        .eq('id', participant.id);
      if (error) throw error;
    },
    onSuccess: (_data, { sessionId }) => queryClient.invalidateQueries({ queryKey: ['quiz_participants', sessionId] }),
  });
}

/** Idempotent lifecycle transition: flips a session's status once its time window has passed. Safe if multiple clients race — the `.eq('status', from)` guard makes duplicate calls no-ops. */
export function useAdvanceQuizSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, from, to }: { sessionId: string; from: QuizSession['status']; to: QuizSession['status'] }) => {
      const { error } = await supabase.from('quiz_sessions').update({ status: to }).eq('id', sessionId).eq('status', from);
      if (error) throw error;
    },
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['quiz_sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['quiz_sessions', 'open'] });
    },
  });
}

export function useUpdateProfileName(profileId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!profileId) throw new Error('No profile yet');
      const { error } = await supabase.from('profiles').update({ name }).eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', profileId] }),
  });
}
