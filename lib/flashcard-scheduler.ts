const STAGE_INTERVAL_DAYS = [0, 1, 3, 7, 14]; // days until next review at each stage

/** Correct answers push the card further out; a miss resets it to stage 0 ("gap"). */
export function nextCardState(currentStage: number, wasCorrect: boolean) {
  const nextStage = wasCorrect
    ? Math.min(currentStage + 1, STAGE_INTERVAL_DAYS.length - 1)
    : 0;
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + STAGE_INTERVAL_DAYS[nextStage]);
  return { nextStage, dueAt };
}
