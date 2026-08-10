export const JOIN_WINDOW_SECONDS = 10;
export const PER_QUESTION_SECONDS = 20;
export const STALE_SESSION_MINUTES = 30;

export type QuizQuestion = { question: string; options: string[]; correct_option: number };

export type QuizAnswerLog = { index: number; correct: boolean; answered_at: string };

export function sessionEndsAt(startsAt: string, cardCount: number): Date {
  return new Date(new Date(startsAt).getTime() + cardCount * PER_QUESTION_SECONDS * 1000);
}

export function rankParticipants<T extends { correct_count: number; finished_at: string | null }>(
  participants: T[]
): T[] {
  return [...participants].sort((a, b) => {
    if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
    const aTime = a.finished_at ? new Date(a.finished_at).getTime() : Infinity;
    const bTime = b.finished_at ? new Date(b.finished_at).getTime() : Infinity;
    return aTime - bTime;
  });
}
