import { Ionicons } from '@expo/vector-icons';
import { AnimatePresence, MotiView } from 'moti';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Flashcard } from '@/hooks/use-flashcards';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

export function NoteFlashcardsDeck({
  label,
  cards,
  onDone,
}: {
  label: string;
  cards: Flashcard[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const done = index >= cards.length;
  const goTo = (i: number) => {
    setIndex(i);
    setRevealed(false);
  };

  const advance = () => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (index + 1 >= cards.length) {
      setIndex(cards.length);
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
  };

  if (done) {
    return (
      <View style={styles.doneState}>
        <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
        <ThemedText type="subtitle" numberOfLines={2} style={styles.doneTitle}>
          {cards.length} flashcard{cards.length === 1 ? '' : 's'} saved
        </ThemedText>
        <ThemedText type="muted" style={styles.doneDesc}>
          They&apos;ll come back around for review, spaced over time.
        </ThemedText>
        <Pressable onPress={onDone} style={[styles.doneBtn, { backgroundColor: colors.tint }]}>
          <ThemedText style={styles.doneBtnLabel}>Back to notes</ThemedText>
        </Pressable>
      </View>
    );
  }

  const card = cards[index];
  const isLast = index + 1 === cards.length;
  const isMultiple = card.question_type === 'multiple';

  return (
    <View>
      <View style={styles.progressRow}>
        <ThemedText type="label" numberOfLines={1} style={[styles.topic, { color: colors.tint }]}>
          {label}
        </ThemedText>
        <ThemedText type="muted">
          {index + 1} / {cards.length}
        </ThemedText>
      </View>

      <View style={styles.dotsRow}>
        {cards.map((_, i) => (
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
            key={`${index}-${revealed}`}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[styles.card, cardStyle(colorScheme)]}>
            <ThemedText style={[styles.questionText, { color: colors.text }]}>{card.front}</ThemedText>

            {revealed && !isMultiple && (
              <View style={[styles.answerBlock, { borderTopColor: colors.border }]}>
                <ThemedText type="muted" style={styles.answerLabel}>
                  Answer
                </ThemedText>
                <ThemedText style={[styles.answerText, { color: colors.tint }]}>{card.back}</ThemedText>
              </View>
            )}

            {revealed && isMultiple && (
              <View style={styles.optionsBlock}>
                {(card.options ?? []).map((option, i) => {
                  const isCorrect = (card.correct_options ?? []).includes(i);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.optionRow,
                        {
                          borderColor: isCorrect ? colors.success : colors.border,
                          backgroundColor: isCorrect ? withAlpha(colors.success, 0.1) : 'transparent',
                        },
                      ]}>
                      {isCorrect && <Ionicons name="checkmark" size={14} color={colors.success} />}
                      <ThemedText
                        numberOfLines={2}
                        style={[styles.optionText, { color: isCorrect ? colors.success : colors.text }]}>
                        {option}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}

            {!revealed && (
              <ThemedText type="muted" style={styles.tapHint}>
                Tap below to reveal the answer
              </ThemedText>
            )}
          </MotiView>
        </AnimatePresence>
      </View>

      <Pressable onPress={advance} style={[styles.nextBtn, { backgroundColor: colors.tint }]}>
        <ThemedText style={styles.nextLabel}>{!revealed ? 'Show answer' : isLast ? 'Done' : 'Next card'}</ThemedText>
        <Ionicons name={!revealed ? 'eye-outline' : 'arrow-forward'} size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  topic: { flex: 1, minWidth: 0 },
  dotsRow: { flexDirection: 'row', gap: 5, marginTop: 10, marginBottom: 14 },
  dotHit: { paddingVertical: 4 },
  dot: { height: 6, borderRadius: 3 },
  cardSlot: { minHeight: 140 },
  card: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
    gap: 14,
  },
  questionText: { fontSize: 17, lineHeight: 26, textAlign: 'left', fontWeight: '600' },
  tapHint: { fontSize: 13 },
  answerBlock: { borderTopWidth: 1, paddingTop: 14, gap: 4 },
  answerLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  answerText: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  optionsBlock: { gap: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  optionText: { flex: 1, fontSize: 14, lineHeight: 19 },
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
  doneTitle: { textAlign: 'center' },
  doneDesc: { textAlign: 'center' },
  doneBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 10 },
  doneBtnLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
