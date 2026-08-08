export const PARTNER_POOL = [
  'Aiman', 'Priya', 'Diego', 'Wei', 'Fatima', 'Noah', 'Sara', 'Tunde', 'Elena', 'Kenji',
];

export const CONVERSATION_PROMPTS = [
  'Describe a bug you fixed this week, as if explaining it to a non-technical friend.',
  'Talk through how you\'d explain your current project to a new intern.',
  'What\'s one thing you learned this week that surprised you?',
  'Practice giving directions: explain how to set up this project from scratch.',
  'Describe your ideal workday, step by step.',
];

export function pickPartner(recentPartners: string[]): string {
  const candidates = PARTNER_POOL.filter((p) => !recentPartners.includes(p));
  const pool = candidates.length > 0 ? candidates : PARTNER_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickPrompt(): string {
  return CONVERSATION_PROMPTS[Math.floor(Math.random() * CONVERSATION_PROMPTS.length)];
}
