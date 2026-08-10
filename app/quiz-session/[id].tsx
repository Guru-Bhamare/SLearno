import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdvanceQuizSessionStatus, useQuizSession, useSubmitAnswer } from '@/hooks/use-quiz-sessions';
import { withAlpha } from '@/lib/color';
import { JOIN_WINDOW_SECONDS, PER_QUESTION_SECONDS, rankParticipants, sessionEndsAt } from '@/lib/quiz';
import { cardStyle, shadow } from '@/lib/theme-styles';

const LOW_TIME_SECONDS = 5;

function formatClock(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
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
    const urgent = secondsLeft <= LOW_TIME_SECONDS;
    const progress = clampProgress(1 - secondsLeft / JOIN_WINDOW_SECONDS);
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <IconBadge name="people-outline" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              {session.topic}
            </ThemedText>
            <ThemedText type="muted" numberOfLines={1}>
              {session.card_count} cards · waiting to start
            </ThemedText>
          </View>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.timerRow}>
          <ThemedText type="label" style={{ color: urgent ? colors.warning : colors.tint }}>
            Starting in
          </ThemedText>
          <View style={[styles.timerPill, { backgroundColor: withAlpha(urgent ? colors.warning : colors.tint, 0.14) }]}>
            <Ionicons name="timer-outline" size={16} color={urgent ? colors.warning : colors.tint} />
            <ThemedText
              type="title"
              style={[styles.timerText, { fontVariant: ['tabular-nums'], color: urgent ? colors.warning : colors.tint }]}>
              {formatClock(secondsLeft)}
            </ThemedText>
          </View>
        </MotiView>

        <View style={[styles.progressTrack, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.tint }]} />
        </View>

        <View style={[styles.joinedCard, cardStyle(colorScheme)]}>
          <ThemedText type="label">Joined ({participants.length})</ThemedText>
          {participants.map((p) => (
            <ThemedText key={p.id} type="muted">
              {p.name}
            </ThemedText>
          ))}
        </View>
      </Screen>
    );
  }

  if (session.status === 'finished') {
    const ranked = rankParticipants(participants);
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <IconBadge name="trophy" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              Results
            </ThemedText>
            <ThemedText type="muted" numberOfLines={1}>
              {session.topic}
            </ThemedText>
          </View>
        </MotiView>

        <View style={styles.resultsList}>
          {ranked.map((p, i) => (
            <View
              key={p.id}
              style={[styles.resultRow, cardStyle(colorScheme), i === 0 ? shadow : undefined]}>
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
  const urgent = secondsLeft <= LOW_TIME_SECONDS;
  const totalActiveSeconds = session.card_count * PER_QUESTION_SECONDS;
  const progress = clampProgress(1 - secondsLeft / totalActiveSeconds);

  if (!question || me.finished_at) {
    return (
      <Screen>
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.doneCard, { backgroundColor: withAlpha(colors.success, 0.12) }]}>
          <IconBadge name="checkmark-circle-outline" color={colors.success} size={36} iconSize={16} />
          <View style={styles.doneText}>
            <ThemedText type="label" style={{ color: colors.success }}>
              You&apos;re done
            </ThemedText>
            <ThemedText type="muted">
              {me.correct_count}/{session.card_count} correct · waiting for others to finish or time to run out.
            </ThemedText>
          </View>
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
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.timerRow}>
        <ThemedText type="muted">
          {questionIndex + 1} / {session.card_count}
        </ThemedText>
        <View style={[styles.timerPill, { backgroundColor: withAlpha(urgent ? colors.warning : colors.tint, 0.14) }]}>
          <Ionicons name="timer-outline" size={16} color={urgent ? colors.warning : colors.tint} />
          <ThemedText
            type="title"
            style={[styles.timerText, { fontVariant: ['tabular-nums'], color: urgent ? colors.warning : colors.tint }]}>
            {formatClock(secondsLeft)}
          </ThemedText>
        </View>
      </MotiView>

      <View style={[styles.progressTrack, { backgroundColor: withAlpha(urgent ? colors.warning : colors.tint, 0.12) }]}>
        <View
          style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: urgent ? colors.warning : colors.tint }]}
        />
      </View>

      <View style={[styles.questionCard, cardStyle(colorScheme), shadow]}>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          {question.question}
        </ThemedText>
      </View>

      <View style={styles.optionsList}>
        {question.options.map((option, i) => {
          const isCorrect = i === question.correct_option;
          const isSelected = selectedOption === i;
          const showResult = selectedOption !== null && (isSelected || isCorrect);
          const borderColor = showResult ? (isCorrect ? colors.success : colors.warning) : colors.tint;
          return (
            <Pressable key={i} onPress={() => answer(i)} style={[styles.option, { borderColor }]}>
              <ThemedText style={{ color: showResult ? borderColor : undefined }}>{option}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 22 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  timerText: { fontSize: 18 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  joinedCard: { padding: 16, gap: 10 },
  resultsList: { gap: 10 },
  resultRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, alignItems: 'flex-start' },
  doneText: { flex: 1, minWidth: 0, gap: 2 },
  questionCard: { padding: 20 },
  optionsList: { gap: 10 },
  option: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
});
