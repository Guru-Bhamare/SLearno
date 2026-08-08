const TOPIC_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['git', 'merge', 'branch', 'rebase'],
    answer:
      'Try `git status` first to see what state you\'re in, then check the "Git Branching" resource in the Library — it covers merge/rebase visually.',
  },
  {
    keywords: ['async', 'promise', 'await'],
    answer:
      'A common gotcha: forgetting to `await` inside a loop. Check the "Debugging Async Code" resource, and try adding console.logs before/after each await to see the actual order of execution.',
  },
  {
    keywords: ['api', 'endpoint', 'rest', 'http'],
    answer:
      'Check the request/response in your network tab first — status code and payload usually tell you which side (client or server) the issue is on. See "Intro to REST APIs" in the Library.',
  },
];

/**
 * Stands in for a mentor's first response so doubts don't sit unanswered.
 * Keyword-matched against a small topic bank; falls back to a neutral
 * acknowledgement that doesn't pretend to have looked at the specifics.
 */
export function getMockAnswer(question: string): string {
  const lower = question.toLowerCase();
  const match = TOPIC_ANSWERS.find((t) => t.keywords.some((k) => lower.includes(k)));
  if (match) return match.answer;
  return "Good question — logged for your mentor. In the meantime, check the Library for related resources, or the common doubts board in case someone's asked something similar.";
}

/**
 * Lightweight, rule-based suggestion to make a question clearer to answer —
 * not a rewrite, just a nudge toward specifics.
 */
export function getRephraseSuggestion(question: string): string | null {
  const trimmed = question.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 12) {
    return 'Try adding what you already tried, and what happened instead of what you expected.';
  }
  if (!trimmed.includes('?') && !/^(how|why|what|when|where|can|should)/i.test(trimmed)) {
    return 'Framing it as a direct question (e.g. "Why does X happen when I do Y?") usually gets a faster, more specific answer.';
  }
  return null;
}
