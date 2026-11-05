/**
 * The shape of each lesson type, the checks every AI-written lesson must pass before it is saved,
 * and the JSON schemas sent to Gemini.
 */
import { z } from 'zod';

import type { GeminiSchema } from '../gemini';

export type LessonKind = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'speaking';

const text = (max: number) => z.string().trim().min(1).max(max);
const options = z.array(text(120)).length(4);

/** A practice question. In the saved lesson the options are shuffled and `answer` is the right one's index. */
export const mcq = z.object({ prompt: text(400), options, answer: z.number().int().min(0).max(3), explanation: text(400) });
export type Mcq = z.infer<typeof mcq>;

/** Gemini writes questions with the correct option first; the server shuffles them. */
const rawMcq = z.object({ prompt: text(400), options, explanation: text(400) });

const raw = {
  grammar: z.object({
    title: text(80),
    explanation: z.array(text(400)).min(2).max(5),
    examples: z.array(z.object({ sentence: text(200), note: text(200) })).min(3).max(5),
    practice: z.array(rawMcq).length(8),
  }),
  vocabulary: z.object({
    title: text(80),
    words: z.array(z.object({ word: text(40), partOfSpeech: text(20), meaning: text(160), example: text(200), collocation: text(80) })).min(6).max(8),
    practice: z.array(rawMcq).length(8),
  }),
  reading: z.object({
    title: text(80),
    text: text(4000),
    glossary: z.array(z.object({ word: text(40), meaning: text(160) })).min(3).max(6),
    questions: z.array(rawMcq).length(5),
  }),
  listening: z.object({
    title: text(80),
    setting: text(160),
    lines: z.array(z.object({ speaker: z.enum(['A', 'B']), text: text(400) })).min(1).max(14),
    questions: z.array(rawMcq).length(3),
    dictation: z.array(text(160)).length(3),
  }),
  writing: z.object({
    title: text(80),
    task: text(500),
    guidance: z.array(text(160)).min(2).max(4),
    usefulLanguage: z.array(text(80)).min(4).max(6),
    minWords: z.number().int().min(20).max(400),
    maxWords: z.number().int().min(30).max(500),
  }),
  speaking: z.object({
    title: text(80),
    shadowing: z.array(text(160)).length(5),
    question: text(300),
    tips: z.array(text(160)).min(2).max(3),
  }),
};
export type RawContent<K extends LessonKind> = z.infer<(typeof raw)[K]>;
export const rawShapes = raw;

/** Reading and listening lengths by level (1 = A1 … 6 = C2), sized for a 10 to 20 minute lesson. */
export const READING_WORDS: Record<number, [number, number]> = { 1: [80, 120], 2: [120, 180], 3: [200, 280], 4: [280, 380], 5: [380, 480], 6: [450, 560] };
export const LISTENING_WORDS: Record<number, [number, number]> = { 1: [40, 70], 2: [70, 110], 3: [110, 160], 4: [150, 210], 5: [180, 240], 6: [200, 270] };

export const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
/** Lower case, no punctuation, single spaces: for comparing dictation and checking quotes. */
export const normalise = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function checkMcqs(list: { prompt: string; options: string[] }[], label: string, needsGap: boolean): string[] {
  const problems: string[] = [];
  list.forEach((q, i) => {
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) problems.push(`${label} ${i + 1}: the four options must all be different.`);
    if (needsGap && q.prompt.split('___').length !== 2) problems.push(`${label} ${i + 1}: the sentence must contain exactly one gap written as ___.`);
  });
  return problems;
}

/** Problems that make a generated lesson unusable. An empty list means it can be saved. */
export function checkLesson(kind: LessonKind, c: unknown, level: number): string[] {
  const problems: string[] = [];
  if (kind === 'grammar') {
    const g = c as RawContent<'grammar'>;
    problems.push(...checkMcqs(g.practice, 'Practice question', true));
  } else if (kind === 'vocabulary') {
    const v = c as RawContent<'vocabulary'>;
    const list = v.words.map((w) => w.word.trim().toLowerCase());
    if (new Set(list).size !== list.length) problems.push('Each word must appear only once.');
    v.words.forEach((w) => {
      const stem = normalise(w.word).slice(0, Math.max(3, Math.min(5, w.word.length - 1)));
      if (!normalise(w.example).includes(stem)) problems.push(`The example for "${w.word}" must use the word.`);
    });
    problems.push(...checkMcqs(v.practice, 'Practice question', true));
    v.practice.forEach((q, i) => {
      if (!list.includes(q.options[0].trim().toLowerCase())) problems.push(`Practice question ${i + 1}: the answer must be one of the lesson's words.`);
    });
  } else if (kind === 'reading') {
    const r = c as RawContent<'reading'>;
    const [min, max] = READING_WORDS[level];
    const n = words(r.text);
    if (n < min * 0.75 || n > max * 1.25) problems.push(`The text has ${n} words; it must have ${min} to ${max}.`);
    r.glossary.forEach((g) => {
      if (!normalise(r.text).includes(normalise(g.word).slice(0, Math.max(3, g.word.length - 2)))) problems.push(`Glossary word "${g.word}" does not appear in the text.`);
    });
    problems.push(...checkMcqs(r.questions, 'Question', false));
  } else if (kind === 'listening') {
    const l = c as RawContent<'listening'>;
    const script = normalise(l.lines.map((x) => x.text).join(' '));
    const [min, max] = LISTENING_WORDS[level];
    const n = words(script);
    if (n < min * 0.75 || n > max * 1.25) problems.push(`The recording has ${n} words; it must have ${min} to ${max}.`);
    l.dictation.forEach((d, i) => {
      if (!script.includes(normalise(d))) problems.push(`Dictation sentence ${i + 1} must be copied word for word from the recording.`);
    });
    if (l.lines.some((x) => /[()[\]<>*#]/.test(x.text))) problems.push('The recording must not contain brackets, symbols or stage directions.');
    problems.push(...checkMcqs(l.questions, 'Question', false));
  } else if (kind === 'writing') {
    const w = c as RawContent<'writing'>;
    if (w.maxWords <= w.minWords) problems.push('maxWords must be larger than minWords.');
  } else if (kind === 'speaking') {
    const s = c as RawContent<'speaking'>;
    s.shadowing.forEach((x, i) => {
      if (words(x) > 22) problems.push(`Shadowing sentence ${i + 1} is too long; keep it under 22 words.`);
    });
  }
  return problems;
}

// --- Gemini response schemas (OpenAPI subset) ---
const S = { type: 'STRING' };
const I = { type: 'INTEGER' };
const arr = (items: GeminiSchema) => ({ type: 'ARRAY', items });
const obj = (properties: Record<string, GeminiSchema>) => ({ type: 'OBJECT', properties, required: Object.keys(properties) });
const geminiMcq = obj({ prompt: S, options: arr(S), explanation: S });

export const GEMINI_SCHEMAS: Record<LessonKind, GeminiSchema> = {
  grammar: obj({ title: S, explanation: arr(S), examples: arr(obj({ sentence: S, note: S })), practice: arr(geminiMcq) }),
  vocabulary: obj({ title: S, words: arr(obj({ word: S, partOfSpeech: S, meaning: S, example: S, collocation: S })), practice: arr(geminiMcq) }),
  reading: obj({ title: S, text: S, glossary: arr(obj({ word: S, meaning: S })), questions: arr(geminiMcq) }),
  listening: obj({ title: S, setting: S, lines: arr(obj({ speaker: { type: 'STRING', enum: ['A', 'B'] }, text: S })), questions: arr(geminiMcq), dictation: arr(S) }),
  writing: obj({ title: S, task: S, guidance: arr(S), usefulLanguage: arr(S), minWords: I, maxWords: I }),
  speaking: obj({ title: S, shadowing: arr(S), question: S, tips: arr(S) }),
};
