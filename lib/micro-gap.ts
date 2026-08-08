import type { Flashcard } from '@/hooks/use-flashcards';
import { todaysPrompt } from '@/lib/curiosity-prompts';

export type MicroGapSuggestion =
  | { kind: 'flashcard'; card: Flashcard }
  | { kind: 'curiosity'; prompt: string }
  | { kind: 'none' };

export const GAP_DURATIONS_MIN = [2, 3, 5] as const;

/**
 * Priority order mirrors how bite-sized each source is for a very short window:
 * a flashcard is a single Q/A, curiosity is a short free-text prompt. Only ever
 * returns one suggestion — the whole point of a micro-gap is removing the
 * "what should I do" decision, not adding one.
 */
export function pickMicroGapSuggestion(input: {
  dueCards: Flashcard[] | undefined;
  curiosityAnsweredToday: boolean;
}): MicroGapSuggestion {
  const card = input.dueCards?.[0];
  if (card) return { kind: 'flashcard', card };

  if (!input.curiosityAnsweredToday) return { kind: 'curiosity', prompt: todaysPrompt() };

  return { kind: 'none' };
}
