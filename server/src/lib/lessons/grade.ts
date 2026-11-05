/** Scoring for lesson answers: dictation word by word, and AI feedback on writing. */
import { z } from 'zod';

import { generateJson, type GeminiSchema } from '../gemini';
import { WRITING_SYSTEM } from '../placement/grading';
import { LEVEL_NAMES, levelLabel, parseLevelName } from '../placement/levels';
import { normalise } from './content';

export type DictationWord = { word: string; ok: boolean };
export type DictationResult = { sentence: string; typed: string; accuracy: number; words: DictationWord[] };

/** Writes contractions out in full, so "I'll" and "I will" count as the same words. */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/'ll\b/g, ' will'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'m\b/g, ' am'],
  [/'d\b/g, ' would'],
  [/\bcannot\b/g, 'can not'],
];
const expand = (t: string) => CONTRACTIONS.reduce((a, [re, to]) => a.replace(re, to), t).replace(/\s+/g, ' ').trim();
const tokens = (t: string) => expand(normalise(t)).split(' ').filter(Boolean);

/**
 * Compares what the learner typed with the sentence, word by word (longest common subsequence), ignoring
 * capitals, punctuation and contractions. Returns each word of the sentence marked heard or missed.
 */
export function scoreDictation(sentence: string, typed: string): DictationResult {
  const ref = tokens(sentence);
  const got = tokens(typed);
  const dp = Array.from({ length: ref.length + 1 }, () => new Array<number>(got.length + 1).fill(0));
  for (let i = ref.length - 1; i >= 0; i--)
    for (let j = got.length - 1; j >= 0; j--) dp[i][j] = ref[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array<boolean>(ref.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < ref.length && j < got.length) {
    if (ref[i] === got[j]) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const matched = ok.filter(Boolean).length;
  // Extra words typed that are not in the sentence also cost accuracy.
  const extra = Math.max(0, got.length - matched);
  const accuracy = ref.length ? Math.max(0, Math.round(((matched - extra * 0.5) / ref.length) * 100)) : 0;
  const display = sentence.split(/\s+/).filter(Boolean);
  // Map each displayed word to its normalised position, so punctuation and capitals are kept for display.
  let k = 0;
  const marked = display.map((w) => {
    const n = expand(normalise(w));
    if (!n) return { word: w, ok: true };
    const parts = n.split(' ').length;
    const good = ok.slice(k, k + parts).every(Boolean);
    k += parts;
    return { word: w, ok: good };
  });
  return { sentence, typed, accuracy, words: marked };
}

const band = z.number().min(0).max(5).transform((n) => Math.round(n));
const lessonWritingShape = z.object({
  level: z.string().refine((s) => parseLevelName(s) !== null),
  plus: z.boolean(),
  summary: z.string().max(600),
  criteria: z.object({ content: band, organisation: band, range: band, accuracy: band }),
  strengths: z.array(z.string().max(300)).max(4),
  improvements: z.array(z.string().max(300)).max(4),
  corrections: z.array(z.object({ original: z.string().max(200), corrected: z.string().max(200), note: z.string().max(200) })).max(8),
  improved: z.string().max(4000),
});
export type LessonWritingFeedback = Omit<z.infer<typeof lessonWritingShape>, 'level' | 'plus'> & { label: string };

const S = { type: 'STRING' };
const I = { type: 'INTEGER' };
const arr = (items: GeminiSchema) => ({ type: 'ARRAY', items });
const obj = (properties: Record<string, GeminiSchema>) => ({ type: 'OBJECT', properties, required: Object.keys(properties) });
const writingSchema = obj({
  level: { type: 'STRING', enum: [...LEVEL_NAMES] },
  plus: { type: 'BOOLEAN' },
  summary: S,
  criteria: obj({ content: I, organisation: I, range: I, accuracy: I }),
  strengths: arr(S),
  improvements: arr(S),
  corrections: arr(obj({ original: S, corrected: S, note: S })),
  improved: S,
});

export async function gradeLessonWriting(task: string, text: string, level: number): Promise<LessonWritingFeedback> {
  const g = await generateJson({
    system: `${WRITING_SYSTEM}\n- improved: rewrite the learner's text as a strong ${LEVEL_NAMES[Math.min(6, level + 1)]} answer to the same task, keeping their ideas, so they can compare. Same length or a little longer.`,
    user: `The learner is working at about ${LEVEL_NAMES[level]}.\nTask: ${task}\n\n<learner>\n${text}\n</learner>`,
    responseSchema: writingSchema,
    parse: lessonWritingShape,
    timeoutMs: 55_000,
  });
  const base = parseLevelName(g.level) ?? level;
  const corrections = g.corrections.filter((c) => c.original.trim() && text.includes(c.original.trim()) && c.original.trim() !== c.corrected.trim()).slice(0, 6);
  return {
    label: levelLabel(base + (g.plus && base < 6 ? 0.5 : 0)),
    summary: g.summary,
    criteria: g.criteria,
    strengths: g.strengths,
    improvements: g.improvements,
    corrections,
    improved: g.improved,
  };
}
