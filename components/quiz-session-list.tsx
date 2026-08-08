import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useCreateQuizSession,
  useJoinQuizSession,
  useOpenQuizSessions,
  useUpdateProfileName,
} from '@/hooks/use-quiz-sessions';
import { withAlpha } from '@/lib/color';
import { cardStyle, shadow } from '@/lib/theme-styles';

const CARD_COUNT_OPTIONS = [5, 10, 15];

function NameCapture({ profileId }: { profileId: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const { mutate: saveName, isPending } = useUpdateProfileName(profileId);

  return (
    <View style={[styles.card, cardStyle(colorScheme)]}>
      <ThemedText type="label">What should we call you?</ThemedText>
      <ThemedText type="muted">Needed so other interns can see who&apos;s hosting or joining a round.</ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.icon}
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
      />
      <Pressable
        disabled={!name.trim() || isPending}
        onPress={() => saveName(name.trim())}
        style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: !name.trim() || isPending ? 0.5 : 1 }]}>
        {isPending ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.primaryBtnText}>Save</ThemedText>}
      </Pressable>
    </View>
  );
}

export function QuizSessionList({ profileId, name }: { profileId: string | undefined; name: string | null | undefined }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { data: sessions, isLoading } = useOpenQuizSessions();
  const { mutate: createSession, isPending: isCreating } = useCreateQuizSession(profileId, name);
  const { mutate: joinSession, isPending: isJoining } = useJoinQuizSession(profileId, name);

  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState(5);

  if (!profileId) return null;

  if (!name) {
    return <NameCapture profileId={profileId} />;
  }

  const create = () => {
    if (!topic.trim()) return;
    createSession(
      { topic: topic.trim(), cardCount },
      { onSuccess: (session) => router.push(`/quiz-session/${session.id}`) }
    );
  };

  const join = (sessionId: string) => {
    joinSession(sessionId, { onSuccess: () => router.push(`/quiz-session/${sessionId}`) });
  };

  return (
    <View style={styles.root}>
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={[styles.card, cardStyle(colorScheme)]}>
        <ThemedText type="label">Start a speed round</ThemedText>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="Topic, e.g. React basics"
          placeholderTextColor={colors.icon}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        <View style={styles.countRow}>
          {CARD_COUNT_OPTIONS.map((count) => {
            const active = cardCount === count;
            return (
              <Pressable
                key={count}
                onPress={() => setCardCount(count)}
                style={[
                  styles.countBtn,
                  { backgroundColor: active ? colors.tint : withAlpha(colors.tint, 0.1) },
                ]}>
                <ThemedText style={{ color: active ? '#fff' : colors.tint, fontWeight: '600' }}>
                  {count} cards
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          disabled={!topic.trim() || isCreating}
          onPress={create}
          style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: !topic.trim() || isCreating ? 0.5 : 1 }]}>
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={16} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>Create session</ThemedText>
            </>
          )}
        </Pressable>
      </MotiView>

      <View style={styles.listSection}>
        <ThemedText type="label">Open sessions</ThemedText>
        {isLoading && <ActivityIndicator color={colors.tint} />}
        {!isLoading && (!sessions || sessions.length === 0) && (
          <ThemedText type="muted">No open sessions right now — start one above.</ThemedText>
        )}
        {sessions?.map((session, i) => (
          <MotiView
            key={session.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: i * 40 }}
            style={[styles.sessionRow, cardStyle(colorScheme), shadow]}>
            <View style={[styles.sessionIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
              <Ionicons name="people-outline" size={16} color={colors.tint} />
            </View>
            <View style={styles.sessionText}>
              <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 16 }}>
                {session.topic}
              </ThemedText>
              <ThemedText type="muted" style={styles.sessionMeta}>
                {session.card_count} cards · {session.status === 'active' ? 'in progress' : 'starting soon'}
              </ThemedText>
            </View>
            <Pressable
              disabled={isJoining}
              onPress={() => join(session.id)}
              style={[styles.joinBtn, { backgroundColor: withAlpha(colors.tint, 0.14) }]}>
              <ThemedText numberOfLines={1} style={[styles.joinText, { color: colors.tint }]}>
                Join
              </ThemedText>
            </Pressable>
          </MotiView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  card: { padding: 16, gap: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  countRow: { flexDirection: 'row', gap: 8 },
  countBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listSection: { gap: 10 },
  sessionRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sessionText: { flex: 1, minWidth: 0, gap: 2 },
  sessionMeta: { fontSize: 13 },
  joinBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, flexShrink: 0 },
  joinText: { fontWeight: '600' },
});
