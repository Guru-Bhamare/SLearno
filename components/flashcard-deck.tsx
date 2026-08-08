import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Flashcard } from '@/hooks/use-flashcards';
import { withAlpha } from '@/lib/color';
import { cardStyle } from '@/lib/theme-styles';

export function FlashcardDeck({
  cards,
  onAnswer,
}: {
  cards: Flashcard[];
  onAnswer: (card: Flashcard, correct: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const flip = useSharedValue(0);
  const exitX = useSharedValue(0);
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  const card = cards[index];
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: exitX.value }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: interpolate(flip.value, [0, 0.5, 0.5001, 1], [1, 1, 0, 0]),
    position: 'absolute',
    width: '100%',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: exitX.value },
      { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: interpolate(flip.value, [0, 0.4999, 0.5, 1], [0, 0, 1, 1]),
    width: '100%',
  }));

  if (!card) {
    return (
      <View style={styles.emptyCard}>
        <ThemedText type="muted">No cards due right now — nice work.</ThemedText>
      </View>
    );
  }

  const flipCard = () => {
    flip.value = withTiming(flip.value === 0 ? 1 : 0, { duration: 350 });
  };

  const answer = (correct: boolean) => {
    onAnswer(card, correct);
    exitX.value = withTiming(correct ? 400 : -400, { duration: 200 }, () => {
      exitX.value = 0;
      flip.value = 0;
    });
    setTimeout(() => {
      setIndex((i) => i + 1);
      setSelectedOption(null);
    }, 200);
  };

  if (card.question_type === 'multiple') {
    const selectOption = (optionIndex: number) => {
      if (selectedOption !== null) return;
      setSelectedOption(optionIndex);
      const correct = (card.correct_options ?? []).includes(optionIndex);
      setTimeout(() => answer(correct), 400);
    };

    return (
      <View>
        <ThemedText type="muted" style={{ marginBottom: 8 }}>
          {index + 1} / {cards.length}
        </ThemedText>
        <View style={[styles.card, cardStyle(colorScheme), { position: 'relative', minHeight: undefined }]}>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            {card.front}
          </ThemedText>
        </View>
        <View style={{ gap: 8, marginTop: 12 }}>
          {(card.options ?? []).map((option, i) => {
            const isCorrect = (card.correct_options ?? []).includes(i);
            const isSelected = selectedOption === i;
            const showResult = selectedOption !== null && (isSelected || isCorrect);
            const borderColor = showResult
              ? isCorrect
                ? Colors[colorScheme].success
                : Colors[colorScheme].warning
              : tint;
            return (
              <Pressable
                key={i}
                onPress={() => selectOption(i)}
                style={[styles.optionButton, { borderColor }]}>
                <ThemedText style={{ color: showResult ? borderColor : undefined }}>{option}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View>
      <ThemedText type="muted" style={{ marginBottom: 8 }}>
        {index + 1} / {cards.length}
      </ThemedText>
      <Pressable onPress={flipCard}>
        <View style={styles.cardStack}>
          <Animated.View style={[styles.card, cardStyle(colorScheme), frontStyle]}>
            <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
              {card.front}
            </ThemedText>
            <ThemedText type="muted">tap to reveal</ThemedText>
          </Animated.View>
          <Animated.View style={[styles.card, { backgroundColor: withAlpha(tint, 0.13) }, backStyle]}>
            <ThemedText style={{ textAlign: 'center' }}>{card.back}</ThemedText>
          </Animated.View>
        </View>
      </Pressable>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => answer(false)}
          style={[styles.answerButton, { borderColor: Colors[colorScheme].warning }]}>
          <ThemedText style={{ color: Colors[colorScheme].warning }}>Not yet</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => answer(true)}
          style={[styles.answerButton, { borderColor: Colors[colorScheme].success }]}>
          <ThemedText style={{ color: Colors[colorScheme].success }}>Got it</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardStack: { minHeight: 140 },
  card: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backfaceVisibility: 'hidden',
  },
  emptyCard: { borderRadius: 16, padding: 20, alignItems: 'center' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  answerButton: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  optionButton: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
});
