/**
 * The adaptive placement test engine. Pure functions only: no database, no network.
 *
 * Each multiple-choice section is a staircase, as in the Oxford Placement Test: it starts at B1,
 * shows a block of questions at one level, moves up a level after a pass and down after a fail,
 * and stops once it has found the highest level passed with the level above it failed.
 */
import { getItem, unitsAt, type BankItem, type McqSection } from './bank';
import type { Level } from './bank/types';
import { levelLabel } from './levels';

export const SECTIONS = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'] as const;
export type Section = (typeof SECTIONS)[number];
export const MCQ_SECTIONS: readonly McqSection[] = ['grammar', 'vocabulary', 'reading', 'listening'];
export const isMcq = (s: Section): s is McqSection => (MCQ_SECTIONS as readonly string[]).includes(s);

export const BLOCK: Record<McqSection, { size: number; pass: number }> = {
  grammar: { size: 4, pass: 3 },
  vocabulary: { size: 4, pass: 3 },
  reading: { size: 3, pass: 2 },
  listening: { size: 3, pass: 2 },
};
export const START_LEVEL: Level = 3;

/** How a skill level was decided, shown to the learner so estimates are never passed off as measurements. */
export type Method = 'staircase' | 'ai' | 'estimate';
export type SkillResult = { score: number; label: string; method: Method };

export type Block = {
  level: Level;
  itemIds: string[];
  /** For each item, the bank option index shown at each position: `orders[i][shown] = bankIndex`. */
  orders: number[][];
  /** For each item, the bank option index the learner chose (0 is correct), or null while unanswered. */
  answers: (number | null)[];
};
export type Stair = { level: Level; passed: Level[]; failed: Level[]; blocks: Block[]; result: SkillResult | null };

export type Rng = () => number;

export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Every item id already placed in a block of any stair in this test. */
export function usedIds(stairs: (Stair | null | undefined)[]): Set<string> {
  const used = new Set<string>();
  for (const s of stairs) for (const b of s?.blocks ?? []) b.itemIds.forEach((id) => used.add(id));
  return used;
}

/**
 * Chooses the questions for one block. Units the learner has never seen come first, so retakes get new
 * questions until the bank at that level runs out. Never repeats an item within the same test.
 */
export function pickBlock(section: McqSection, level: Level, usedInTest: Set<string>, seenBefore: Set<string>, rng: Rng): Block {
  const size = BLOCK[section].size;
  const available = unitsAt(section, level).filter((u) => !u.some((id) => usedInTest.has(id)));
  const fresh = shuffle(available.filter((u) => !u.some((id) => seenBefore.has(id))), rng);
  const stale = shuffle(available.filter((u) => u.some((id) => seenBefore.has(id))), rng);
  // Avoid two items on the same grammar point in one block (for example two inversion questions),
  // because seeing one helps with the other. Falls back to any item if the level runs short.
  const family = (u: string[]) => (getItem(u[0])?.topic ?? u[0]).toLowerCase().split(/[\s:(]+/).slice(0, 2).join(' ');
  const ordered = [...fresh, ...stale];
  const itemIds: string[] = [];
  const families = new Set<string>();
  for (const pass of [true, false]) {
    for (const unit of ordered) {
      if (itemIds.length >= size) break;
      if (unit.some((id) => itemIds.includes(id))) continue;
      if (pass && families.has(family(unit))) continue;
      itemIds.push(...unit);
      families.add(family(unit));
    }
  }
  if (itemIds.length < size) throw new Error(`Not enough ${section} items at level ${level}`);
  const chosen = itemIds.slice(0, size);
  return { level, itemIds: chosen, orders: chosen.map(() => shuffle([0, 1, 2, 3], rng)), answers: chosen.map(() => null) };
}

/** Starts a section at B1, or at `start` (the learner's current level) for a checkpoint test. */
export function newStair(section: McqSection, usedInTest: Set<string>, seenBefore: Set<string>, rng: Rng, start: Level = START_LEVEL): Stair {
  return { level: start, passed: [], failed: [], blocks: [pickBlock(section, start, usedInTest, seenBefore, rng)], result: null };
}

export const correctCount = (b: Block) => b.answers.filter((a) => a === 0).length;

/** The next unanswered question in a stair, or null if the section is finished. */
export function pendingItem(stair: Stair): { block: Block; index: number } | null {
  if (stair.result) return null;
  const block = stair.blocks[stair.blocks.length - 1];
  const index = block ? block.answers.findIndex((a) => a === null) : -1;
  return index >= 0 ? { block, index } : null;
}

/** Thrown when an answer does not match the question the server is waiting for. */
export class StaleAnswerError extends Error {}

/**
 * Records an answer. `shownChoice` is the option position the learner tapped. When the block is complete
 * the stair moves up or down, or finishes with a result. Returns a new stair; the input is not changed.
 */
export function answer(
  section: McqSection,
  stair: Stair,
  itemId: string,
  shownChoice: number,
  usedInTest: Set<string>,
  seenBefore: Set<string>,
  rng: Rng,
): Stair {
  const s: Stair = structuredClone(stair);
  const pending = pendingItem(s);
  if (!pending) throw new StaleAnswerError('This section is already finished.');
  const block = s.blocks[s.blocks.length - 1];
  if (block.itemIds[pending.index] !== itemId) throw new StaleAnswerError('That is not the current question.');
  if (!Number.isInteger(shownChoice) || shownChoice < 0 || shownChoice > 3) throw new RangeError('Choose one of the four options.');
  block.answers[pending.index] = block.orders[pending.index][shownChoice];
  if (block.answers.some((a) => a === null)) return s;

  const L = block.level;
  const passedBlock = correctCount(block) >= BLOCK[section].pass;
  let done: number | null = null;
  if (passedBlock) {
    s.passed.push(L);
    if (L === 6) done = 6;
    else if (s.failed.includes((L + 1) as Level)) done = L;
    else s.level = (L + 1) as Level;
  } else {
    s.failed.push(L);
    if (L === 1) done = 0;
    else if (s.passed.includes((L - 1) as Level)) done = L - 1;
    else s.level = (L - 1) as Level;
  }
  if (done === null) {
    const used = new Set([...usedInTest, ...usedIds([s])]);
    s.blocks.push(pickBlock(section, s.level, used, seenBefore, rng));
  } else {
    s.result = stairResult(section, s, done);
  }
  return s;
}

/**
 * The skill score is the highest level passed plus the share of questions right at the level above,
 * so passing B1 and getting 2 of 4 at B2 scores 3.5 ("B1+").
 */
export function stairResult(section: McqSection, stair: Stair, level: number): SkillResult {
  const above = stair.blocks.find((b) => b.level === level + 1);
  const fraction = level < 6 && above ? correctCount(above) / BLOCK[section].size : 0;
  const score = Math.round(Math.min(level + fraction, level + 0.99) * 100) / 100;
  return { score, label: levelLabel(score), method: 'staircase' };
}

/** The question as the phone sees it: shuffled options and no answer. */
export function publicItem(item: BankItem, order: number[]) {
  return {
    id: item.id,
    prompt: item.prompt,
    options: order.map((i) => item.options[i]),
    passage: item.passage,
    lines: item.lines,
  };
}
export type PublicItem = ReturnType<typeof publicItem>;

export type Mistake = {
  section: McqSection;
  itemId: string;
  prompt: string;
  chosen: string;
  correct: string;
  explanation: string;
  topic: string | null;
  passageTitle: string | null;
  transcript: string | null;
  level: Level;
};

export function mistakesOf(section: McqSection, stair: Stair): Mistake[] {
  const out: Mistake[] = [];
  for (const block of stair.blocks)
    block.itemIds.forEach((id, i) => {
      const chosen = block.answers[i];
      const item = getItem(id);
      if (chosen === null || chosen === 0 || !item) return;
      out.push({
        section,
        itemId: id,
        prompt: item.prompt,
        chosen: item.options[chosen],
        correct: item.options[0],
        explanation: item.explanation,
        topic: item.topic,
        passageTitle: item.passage?.title ?? null,
        transcript: item.lines ? item.lines.map((l) => `${l.speaker}: ${l.text}`).join('\n') : null,
        level: block.level,
      });
    });
  return out;
}
