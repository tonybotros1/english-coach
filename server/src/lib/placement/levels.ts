/** CEFR levels as numbers: 0 = Pre-A1, 1 = A1 … 6 = C2. Skill and overall scores are decimals on the same scale. */
export const LEVEL_NAMES = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type LevelName = (typeof LEVEL_NAMES)[number];

/**
 * "B1+" means the learner passed B1 and got at least half of the B2 questions right.
 * CEFR has no "Pre-A1+" or "C2+", so those levels never get a plus.
 */
export function levelLabel(score: number): string {
  const s = Math.max(0, Math.min(6, score));
  const base = Math.floor(s + 1e-9);
  const plus = base >= 1 && base < 6 && s - base >= 0.5;
  return `${LEVEL_NAMES[base]}${plus ? '+' : ''}`;
}

/** Council of Europe CEFR global scale, shortened and written to the learner. */
export const LEVEL_SUMMARIES: Record<number, string> = {
  0: 'You are just starting. You recognise some familiar words and very basic phrases.',
  1: 'You understand and use familiar everyday expressions and very basic phrases, and can interact simply if people speak slowly and clearly.',
  2: 'You understand frequent expressions about familiar topics and can communicate in simple, routine tasks.',
  3: 'You can deal with most everyday situations, describe experiences and plans, and briefly give reasons for your opinions.',
  4: 'You understand the main ideas of complex text, interact with a good degree of fluency, and write clear, detailed text on many subjects.',
  5: 'You understand demanding, longer texts, express yourself fluently without searching for words, and use English flexibly for work and study.',
  6: 'You understand virtually everything you hear or read, and express yourself very fluently and precisely, even in complex situations.',
};

export type Equivalents = { ielts: string; toeflIbt: string; toeflBand: string; cambridge: string; cambridgeScale: string };

/**
 * Indicative exam equivalents for each CEFR level, from published alignments:
 * IELTS (British Council / IDP), TOEFL iBT (ETS, including the 1–6 band scale used since January 2026),
 * and Cambridge English exams and the Cambridge English Scale.
 */
export const EQUIVALENTS: Record<number, Equivalents> = {
  0: { ielts: '—', toeflIbt: '—', toeflBand: '—', cambridge: '—', cambridgeScale: 'below 100' },
  1: { ielts: '—', toeflIbt: '—', toeflBand: '1', cambridge: '—', cambridgeScale: '100–119' },
  2: { ielts: 'below 4.0', toeflIbt: '—', toeflBand: '2', cambridge: 'A2 Key', cambridgeScale: '120–139' },
  3: { ielts: '4.0–5.0', toeflIbt: '42–71', toeflBand: '3', cambridge: 'B1 Preliminary', cambridgeScale: '140–159' },
  4: { ielts: '5.5–6.5', toeflIbt: '72–94', toeflBand: '4', cambridge: 'B2 First', cambridgeScale: '160–179' },
  5: { ielts: '7.0–8.0', toeflIbt: '95–113', toeflBand: '5', cambridge: 'C1 Advanced', cambridgeScale: '180–199' },
  6: { ielts: '8.5–9.0', toeflIbt: '114–120', toeflBand: '6', cambridge: 'C2 Proficiency', cambridgeScale: '200–230' },
};

/** Parses a level name from an AI grader ("B2", "pre-a1") into 0–6, or null. */
export function parseLevelName(name: string): number | null {
  const n = name.trim().toUpperCase().replace(/[\s_]/g, '-');
  if (n === 'PRE-A1' || n === 'PREA1' || n === 'A0') return 0;
  const i = LEVEL_NAMES.findIndex((l) => l.toUpperCase() === n);
  return i >= 0 ? i : null;
}
