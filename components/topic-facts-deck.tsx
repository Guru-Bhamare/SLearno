import { Ionicons } from '@expo/vector-icons';
import { AnimatePresence, MotiView } from 'moti';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

export function TopicFactsDeck({ topic, facts }: { topic: string; facts: string[] }) {
  const [index, setIndex] = useState(0);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const done = index >= facts.length;
  const advance = () => setIndex((i) => i + 1);
  const goTo = (i: number) => setIndex(i);

  if (done) {
    return (
      <View style={styles.doneState}>
        <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
        <ThemedText type="subtitle" numberOfLines={2} style={styles.doneTitle}>
          That&apos;s everything on {topic}
        </ThemedText>
        <ThemedText type="muted" style={styles.doneDesc}>
          {facts.length} quick facts down. Start a new gap for another topic.
        </ThemedText>
      </View>
    );
  }

  const fact = facts[index];

  return (
    <View>
      <View style={styles.progressRow}>
        <ThemedText type="label" numberOfLines={1} style={[styles.topic, { color: colors.tint }]}>
          {topic}
        </ThemedText>
        <ThemedText type="muted">
          {index + 1} / {facts.length}
        </ThemedText>
      </View>

      <View style={styles.dotsRow}>
        {facts.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={6} style={styles.dotHit}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.tint : withAlpha(colors.icon, 0.25),
                  width: i === index ? 18 : 6,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.cardSlot}>
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={index}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[styles.card, cardStyle(colorScheme)]}>
            <ThemedText style={[styles.factText, { color: colors.text }]}>{fact}</ThemedText>
          </MotiView>
        </AnimatePresence>
      </View>

      <Pressable
        onPress={advance}
        style={[styles.nextBtn, { backgroundColor: colors.tint }]}>
        <ThemedText style={styles.nextLabel}>{index + 1 === facts.length ? 'Done' : 'Next fact'}</ThemedText>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  topic: { flex: 1, minWidth: 0, textTransform: 'capitalize' },
  dotsRow: { flexDirection: 'row', gap: 5, marginTop: 10, marginBottom: 14 },
  dotHit: { paddingVertical: 4 },
  dot: { height: 6, borderRadius: 3 },
  cardSlot: { minHeight: 140 },
  card: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
  },
  factText: { fontSize: 17, lineHeight: 26, textAlign: 'left' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  nextLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  doneState: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  doneTitle: { textAlign: 'center', textTransform: 'capitalize' },
  doneDesc: { textAlign: 'center' },
});
