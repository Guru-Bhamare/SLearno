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
