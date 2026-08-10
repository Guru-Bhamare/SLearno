import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AnimatedCounter } from '@/components/animated-counter';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAskDoubt, useDoubts } from '@/hooks/use-doubts';
import { withAlpha } from '@/lib/color';
import { getRephraseSuggestion } from '@/lib/doubt-helper';
import { cardStyle } from '@/lib/theme-styles';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AuthorChip({ anonymous, accent }: { anonymous: boolean; accent: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(accent, 0.1), borderColor: withAlpha(accent, 0.18) }]}>
      <Ionicons name={anonymous ? 'eye-off-outline' : 'person-outline'} size={11} color={accent} />
      <ThemedText numberOfLines={1} style={[styles.chipText, { color: accent }]}>
        {anonymous ? 'Anonymous' : 'You'}
      </ThemedText>
    </View>
  );
}

export default function DoubtsScreen() {
  const { profile } = useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tint = colors.tint;

  const [question, setQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: doubts, isLoading } = useDoubts(profile?.id);
  const { mutate: ask, isPending } = useAskDoubt(profile?.id);

  const suggestion = useMemo(() => getRephraseSuggestion(question), [question]);

  const submit = () => {
    if (!question.trim()) return;
    ask({ question: question.trim(), isAnonymous }, { onSuccess: () => setQuestion('') });
  };

  return (
    <Screen>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.header}>
        <View style={styles.headerLeft}>
          <IconBadge name="help-circle-outline" color={tint} size={44} iconSize={20} />
          <View style={styles.headerText}>
            <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>
              Doubts
            </ThemedText>
            <ThemedText type="muted" numberOfLines={2}>
              Ask without a live, face-to-face moment.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.countBadge, { backgroundColor: withAlpha(tint, 0.12) }]}>
          <Ionicons name="chatbubbles-outline" size={16} color={tint} />
          <AnimatedCounter value={doubts?.length ?? 0} style={{ color: tint, fontWeight: '700', fontSize: 15 }} />
        </View>
      </MotiView>

      {/* Ask card */}
      <MotiView
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={[styles.askCard, cardStyle(colorScheme), { borderColor: colors.border }]}>
        <ThemedText type="label" style={{ color: tint }}>
          What&apos;s tripping you up?
        </ThemedText>

        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Describe what you tried and what happened instead…"
          placeholderTextColor={colors.icon}
          multiline
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
        />

        {suggestion && (
          <MotiView from={{ opacity: 0, translateY: -4 }} animate={{ opacity: 1, translateY: 0 }} style={styles.hintRow}>
            <Ionicons name="bulb-outline" size={14} color={tint} style={styles.hintIcon} />
            <ThemedText type="muted" style={styles.hintText}>
              {suggestion}
            </ThemedText>
          </MotiView>
        )}

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Ionicons name={isAnonymous ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.icon} />
            <ThemedText style={styles.toggleLabel}>Ask anonymously</ThemedText>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ true: tint }}
            thumbColor={colorScheme === 'dark' ? colors.card : colors.tint }
          />
        </View>

        <Pressable
          onPress={submit}
          disabled={isPending || !question.trim()}
          style={[styles.primaryBtn, { backgroundColor: tint, opacity: isPending || !question.trim() ? 0.5 : 1 }]}>
          <Ionicons name="paper-plane-outline" size={16} color="#fff" />
          <ThemedText numberOfLines={1} style={styles.primaryBtnText}>
            {isPending ? 'Sending…' : 'Ask'}
          </ThemedText>
        </Pressable>
      </MotiView>

      {/* Common doubts */}
      <View style={[styles.sectionCard, cardStyle(colorScheme)]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(tint, 0.1) }]}>
              <Ionicons name="people-outline" size={16} color={tint} />
            </View>
            <View style={styles.sectionTitleText}>
              <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 17 }}>
                Common doubts
              </ThemedText>
              <ThemedText type="muted" style={styles.sectionCount}>
                {doubts?.length ?? 0} asked
              </ThemedText>
            </View>
          </View>
        </View>

        {isLoading && <ActivityIndicator color={tint} style={{ marginVertical: 8 }} />}

        {!isLoading && (!doubts || doubts.length === 0) && (
          <View style={styles.emptyState}>
            <IconBadge name="sparkles-outline" color={tint} size={36} iconSize={16} />
            <View style={styles.emptyText}>
              <ThemedText type="label">Nothing yet</ThemedText>
              <ThemedText type="muted" style={styles.emptyDesc}>
                Nothing asked yet — yours could be the first.
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.itemList}>
          {doubts?.map((d, i) => (
            <MotiView
              key={d.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: i * 50 }}
              style={[styles.itemWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.itemHeader}>
                <AuthorChip anonymous={d.is_anonymous} accent={tint} />
                <ThemedText type="muted" style={styles.itemWhen}>
                  {formatWhen(d.created_at)}
                </ThemedText>
              </View>

              <ThemedText style={styles.itemQuestion}>{d.question}</ThemedText>

              {d.mock_answer && (
                <View style={[styles.answerBubble, { borderColor: tint, backgroundColor: withAlpha(tint, 0.06) }]}>
                  <ThemedText type="label" style={{ color: tint, fontSize: 11 }}>
                    Mentor tip
                  </ThemedText>
                  <ThemedText type="muted" style={styles.answerText}>
                    {d.mock_answer}
                  </ThemedText>
                </View>
              )}
            </MotiView>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 22, lineHeight: 28 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
  },
  askCard: { padding: 16, gap: 12, borderWidth: 1, overflow: 'hidden' },
  input: { borderRadius: 14, padding: 12, fontSize: 15, minHeight: 90, textAlignVertical: 'top' },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hintIcon: { marginTop: 2 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 14 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionCard: { padding: 16, gap: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitleText: { flex: 1, minWidth: 0, gap: 2 },
  sectionCount: { fontSize: 13 },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  emptyText: { flex: 1, minWidth: 0, gap: 2 },
  emptyDesc: { fontSize: 13, lineHeight: 18 },
  itemList: { gap: 8 },
  itemWrap: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemWhen: { fontSize: 12 },
  itemQuestion: { fontSize: 15, lineHeight: 21 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  answerBubble: { borderLeftWidth: 3, borderRadius: 8, padding: 10, gap: 4 },
  answerText: { fontSize: 13, lineHeight: 18 },
});
