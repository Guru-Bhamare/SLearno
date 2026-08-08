import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdvanceQuizSessionStatus, useQuizSession, useSubmitAnswer } from '@/hooks/use-quiz-sessions';
import { withAlpha } from '@/lib/color';
import { rankParticipants, sessionEndsAt } from '@/lib/quiz';
import { cardStyle, shadow } from '@/lib/theme-styles';

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuizSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { profile } = useSession();

  const { session: sessionQuery, participants: participantsQuery } = useQuizSession(id);
  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitAnswer(profile?.id);
  const { mutate: advanceStatus } = useAdvanceQuizSessionStatus();

  const [nowTick, setNowTick] = useState(Date.now());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const session = sessionQuery.data;
  const participants = useMemo(() => participantsQuery.data ?? [], [participantsQuery.data]);
  const me = useMemo(() => participants.find((p) => p.profile_id === profile?.id), [participants, profile?.id]);

  const startsAtMs = session ? new Date(session.starts_at).getTime() : 0;
  const endsAtMs = session ? sessionEndsAt(session.starts_at, session.card_count).getTime() : 0;

  useEffect(() => {
    if (!session) return;
    if (session.status === 'open' && nowTick >= startsAtMs) {
      advanceStatus({ sessionId: session.id, from: 'open', to: 'active' });
    }
    if (session.status === 'active' && nowTick >= endsAtMs) {
      advanceStatus({ sessionId: session.id, from: 'active', to: 'finished' });
    }
  }, [session, nowTick, startsAtMs, endsAtMs, advanceStatus]);

  const allFinished = participants.length > 0 && participants.every((p) => !!p.finished_at);
  useEffect(() => {
    if (session?.status === 'active' && allFinished) {
      advanceStatus({ sessionId: session.id, from: 'active', to: 'finished' });
    }
  }, [session, allFinished, advanceStatus]);

  if (sessionQuery.isLoading || !session) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (session.status === 'open') {
    const secondsLeft = Math.ceil((startsAtMs - nowTick) / 1000);
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 16 }}>
          <ThemedText type="title">{session.topic}</ThemedText>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <ThemedText type="label" style={{ color: colors.tint }}>
              Starting in
            </ThemedText>
            <ThemedText type="title" style={{ fontSize: 40, fontVariant: ['tabular-nums'], color: colors.tint }}>
              {formatClock(secondsLeft)}
            </ThemedText>
          </View>
          <View style={{ gap: 8 }}>
            <ThemedText type="label">Joined ({participants.length})</ThemedText>
            {participants.map((p) => (
              <ThemedText key={p.id} type="muted">
                {p.name}
              </ThemedText>
            ))}
          </View>
        </MotiView>
      </Screen>
    );
  }

  if (session.status === 'finished') {
    const ranked = rankParticipants(participants);
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={{ gap: 16 }}>
          <ThemedText type="title">Results — {session.topic}</ThemedText>
          <View style={{ gap: 10 }}>
            {ranked.map((p, i) => (
              <View
                key={p.id}
                style={[
                  { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
                  cardStyle(colorScheme),
                  i === 0 ? shadow : undefined,
                ]}>
                <ThemedText type="title" style={{ fontSize: 18, width: 28, color: i === 0 ? colors.tint : colors.icon }}>
                  {i + 1}
                </ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">
                    {p.name}
                    {p.profile_id === profile?.id ? ' (you)' : ''}
                  </ThemedText>
                  <ThemedText type="muted">
                    {p.correct_count}/{session.card_count} correct
                  </ThemedText>
                </View>
                {i === 0 && <Ionicons name="trophy" size={22} color={colors.tint} />}
              </View>
            ))}
          </View>
        </MotiView>
      </Screen>
    );
  }

  if (!me) {
    return (
      <Screen>
        <ThemedText type="muted">You&apos;re not part of this session.</ThemedText>
      </Screen>
    );
  }

  const questionIndex = me.answers.length;
  const question = session.questions[questionIndex];
  const secondsLeft = Math.ceil((endsAtMs - nowTick) / 1000);

  if (!question || me.finished_at) {
    return (
      <Screen>
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gap: 10, alignItems: 'center', paddingTop: 40 }}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          <ThemedText type="subtitle">You&apos;re done</ThemedText>
          <ThemedText type="muted">
            {me.correct_count}/{session.card_count} correct · waiting for others to finish or time to run out.
          </ThemedText>
        </MotiView>
      </Screen>
    );
  }

  const answer = (optionIndex: number) => {
    if (selectedOption !== null || isSubmitting) return;
    setSelectedOption(optionIndex);
    const correct = optionIndex === question.correct_option;
    submitAnswer(
      {
        sessionId: session.id,
        participant: me,
        index: questionIndex,
        correct,
        isLast: questionIndex === session.card_count - 1,
      },
      { onSuccess: () => setSelectedOption(null) }
    );
  };

  return (
    <Screen>
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText type="muted">
          {questionIndex + 1} / {session.card_count}
        </ThemedText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: withAlpha(colors.tint, 0.14),
          }}>
          <Ionicons name="timer-outline" size={14} color={colors.tint} />
          <ThemedText style={{ color: colors.tint, fontVariant: ['tabular-nums'] }}>
            {formatClock(secondsLeft)}
          </ThemedText>
        </View>
      </MotiView>

      <View style={[{ padding: 20 }, cardStyle(colorScheme), shadow]}>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          {question.question}
        </ThemedText>
      </View>

      <View style={{ gap: 10 }}>
        {question.options.map((option, i) => {
          const isCorrect = i === question.correct_option;
          const isSelected = selectedOption === i;
          const showResult = selectedOption !== null && (isSelected || isCorrect);
          const borderColor = showResult ? (isCorrect ? colors.success : colors.warning) : colors.tint;
          return (
            <Pressable
              key={i}
              onPress={() => answer(i)}
              style={{ borderWidth: 1.5, borderColor, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
              <ThemedText style={{ color: showResult ? borderColor : undefined }}>{option}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
