import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconBadge } from '@/components/icon-badge';
import { QuizSessionList } from '@/components/quiz-session-list';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TopicFactsDeck } from '@/components/topic-facts-deck';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGenerateTopicFacts } from '@/hooks/use-topic-facts';
import { withAlpha } from '@/lib/color';
import { GAP_DURATIONS_MIN } from '@/lib/micro-gap';
import { cardStyle, shadow } from '@/lib/theme-styles';

type Mode = 'solo' | 'speed';

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ModeSwitcher({
  mode,
  onChange,
  colorScheme,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  colorScheme: 'light' | 'dark';
}) {
  const colors = Colors[colorScheme];

  return (
    <View style={styles.modeRow}>
      {(['solo', 'speed'] as const).map((m) => {
        const active = mode === m;
        const icon = m === 'solo' ? (active ? 'flash' : 'flash-outline') : active ? 'trophy' : 'trophy-outline';
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={[
              styles.modeBtn,
              cardStyle(colorScheme),
              active && { borderColor: colors.tint, backgroundColor: withAlpha(colors.tint, 0.08) },
            ]}>
            <Ionicons name={icon} size={16} color={active ? colors.tint : colors.icon} />
            <ThemedText numberOfLines={1} style={[styles.modeLabel, { color: active ? colors.tint : colors.text }]}>
              {m === 'solo' ? 'Solo' : 'Speed round'}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MicroGapScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [mode, setMode] = useState<Mode>('solo');
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const [pendingMinutes, setPendingMinutes] = useState<number | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [facts, setFacts] = useState<string[] | null>(null);
  const { mutate: generateFacts, isPending: isGeneratingFacts, error: factsError, reset: resetFactsRequest } =
    useGenerateTopicFacts();

  useEffect(() => {
    if (durationMin == null) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [durationMin]);

  const startGap = (minutes: number) => {
    setDurationMin(minutes);
    setSecondsLeft(minutes * 60);
    setExpired(false);
  };

  const chooseDuration = (minutes: number) => {
    setPendingMinutes(minutes);
    resetFactsRequest();
  };

  const backToDuration = () => {
    setPendingMinutes(null);
    setTopicInput('');
    resetFactsRequest();
  };

  const submitTopic = () => {
    const trimmed = topicInput.trim();
    if (!trimmed || pendingMinutes == null) return;
    generateFacts(trimmed, {
      onSuccess: (result) => {
        setTopic(trimmed);
        setFacts(result);
        startGap(pendingMinutes);
        setPendingMinutes(null);
        setTopicInput('');
      },
    });
  };

  const endGap = () => {
    setDurationMin(null);
    setSecondsLeft(0);
    setExpired(false);
    setPendingMinutes(null);
    setTopicInput('');
    setTopic(null);
    setFacts(null);
    resetFactsRequest();
  };

  const totalSeconds = (durationMin ?? 0) * 60;
  const progress = totalSeconds ? 1 - secondsLeft / totalSeconds : 0;

  if (mode === 'speed') {
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <IconBadge name="trophy" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              Speed round
            </ThemedText>
            <ThemedText type="muted" numberOfLines={2}>
              Opt-in — a quick, competitive quiz with other interns.
            </ThemedText>
          </View>
        </MotiView>

        <ModeSwitcher mode={mode} onChange={setMode} colorScheme={colorScheme} />

        <QuizSessionList profileId={profile?.id} name={profile?.name} />
      </Screen>
    );
  }

  if (durationMin == null && pendingMinutes == null) {
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <IconBadge name="flash" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              Micro-gap
            </ThemedText>
            <ThemedText type="muted" numberOfLines={2}>
              Got a few spare minutes? Put them to use.
            </ThemedText>
          </View>
        </MotiView>

        <ModeSwitcher mode={mode} onChange={setMode} colorScheme={colorScheme} />

        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[styles.durationCard, cardStyle(colorScheme)]}>
          <ThemedText type="label">How much time do you have?</ThemedText>
          <View style={styles.durationRow}>
            {GAP_DURATIONS_MIN.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => chooseDuration(minutes)}
                style={[styles.durationBtn, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
                <ThemedText type="title" style={[styles.durationValue, { color: colors.tint }]}>
                  {minutes}
                </ThemedText>
                <ThemedText type="muted">min</ThemedText>
              </Pressable>
            ))}
          </View>
        </MotiView>

       
      </Screen>
    );
  }

  if (durationMin == null && pendingMinutes != null) {
    return (
      <Screen>
        <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <IconBadge name="bulb-outline" color={colors.tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              explore?
            </ThemedText>
            <ThemedText type="muted" numberOfLines={2}>
              {pendingMinutes} min of quick facts on any topic.
            </ThemedText>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[styles.durationCard, cardStyle(colorScheme)]}>
          <ThemedText type="label">Topic</ThemedText>
          <TextInput
            value={topicInput}
            onChangeText={setTopicInput}
            placeholder="e.g. black holes,Quantum computing"
            placeholderTextColor={colors.icon}
            autoFocus
            editable={!isGeneratingFacts}
            onSubmitEditing={submitTopic}
            returnKeyType="go"
            style={[styles.topicInput, { color: colors.text, borderColor: colors.border }]}
          />
          {factsError && (
            <ThemedText type="muted" style={{ color: colors.warning }}>
              {factsError instanceof Error ? factsError.message : 'Something went wrong — try again.'}
            </ThemedText>
          )}
          <Pressable
            disabled={!topicInput.trim() || isGeneratingFacts}
            onPress={submitTopic}
            style={[
              styles.submitButton,
              { backgroundColor: colors.tint, opacity: !topicInput.trim() || isGeneratingFacts ? 0.5 : 1 },
            ]}>
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
              {isGeneratingFacts ? 'Finding facts…' : 'Start'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={backToDuration} disabled={isGeneratingFacts} style={styles.backButton}>
            <ThemedText type="muted" style={{ color: colors.icon }}>
              Back
            </ThemedText>
          </Pressable>
        </MotiView>
      </Screen>
    );
  }

  return (
    <Screen>
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={styles.timerRow}>
        <View
          style={[styles.timerPill, { backgroundColor: withAlpha(expired ? colors.warning : colors.tint, 0.14) }]}>
          <Ionicons name="timer-outline" size={16} color={expired ? colors.warning : colors.tint} />
          <ThemedText
            type="title"
            style={[styles.timerText, { fontVariant: ['tabular-nums'], color: expired ? colors.warning : colors.tint }]}>
            {formatClock(secondsLeft)}
          </ThemedText>
        </View>
        <Pressable onPress={endGap} style={[styles.endBtn, { backgroundColor: withAlpha(colors.icon, 0.1) }]}>
          <Ionicons name="close" size={14} color={colors.icon} />
          <ThemedText numberOfLines={1} style={[styles.endText, { color: colors.icon }]}>
            End
          </ThemedText>
        </Pressable>
      </MotiView>

      {!expired && (
        <View style={[styles.progressTrack, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.tint }]} />
        </View>
      )}

      {expired && (
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[styles.expiredCard, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
          <IconBadge name="hourglass-outline" color={colors.warning} size={36} iconSize={16} />
          <View style={styles.expiredText}>
            <ThemedText type="label" style={{ color: colors.warning }}>
              Gap&apos;s up
            </ThemedText>
            <ThemedText type="muted">
              That&apos;s fine — nothing here is lost. Pick it back up at the next gap.
            </ThemedText>
          </View>
        </MotiView>
      )}

      <View style={[styles.contentCard, cardStyle(colorScheme), shadow]}>
        {topic && facts && <TopicFactsDeck topic={topic} facts={facts} />}
      </View>

      
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 22 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  modeLabel: { fontSize: 14, fontWeight: '600' },
  durationCard: { padding: 16, gap: 14 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationBtn: { flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  durationValue: { fontSize: 20 },
  infoCard: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, minWidth: 0, gap: 4 },
  infoDesc: { fontSize: 14, lineHeight: 20 },
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
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  endText: { fontWeight: '600', fontSize: 13 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  expiredCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, alignItems: 'flex-start' },
  expiredText: { flex: 1, minWidth: 0, gap: 2 },
  contentCard: { padding: 18, gap: 14 },
  newGapBtn: { alignSelf: 'center', padding: 8 },
  topicInput: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
  submitButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  backButton: { alignSelf: 'center', padding: 6 },
});
