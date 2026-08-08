const PROMPTS = [
  "What's one new word or concept you came across today?",
  'What surprised you today, even a little?',
  "What's something you understood better today than yesterday?",
  'What question are you still sitting with?',
  "If you had to explain today's main idea in one sentence, what would it be?",
  "What's something you noticed someone else do well today?",
];

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function todaysPrompt(): string {
  return PROMPTS[dayOfYear(new Date()) % PROMPTS.length];
}
