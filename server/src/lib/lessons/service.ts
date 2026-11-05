/**
 * Lessons for the plan's daily tasks. Each task gets one lesson, written by Gemini the first time it is
 * opened and saved, so reopening it is instant and free. Finishing a lesson records the result, turns
 * mistakes and new words into review cards, and ticks the task off on Today.
 */
import { ObjectId, type Db, type WithId } from 'mongodb';

import type { UserDoc } from '../auth';
import { assessPronunciation, assessSpontaneous, isSpeechConfigured, type Assessment } from '../azureSpeech';
import { addLessonCards, type NewCard } from '../cards';
import { addDays, localDate } from '../dates';
import { ConfigError, HttpError } from '../errors';
import { isGeminiConfigured } from '../gemini';
import { gradeSpeaking, type SpeakingFeedback } from '../placement/grading';
import { levelLabel } from '../placement/levels';
import type { Skill } from '../plan/content';
import type { Task } from '../plan/engine';
import { activePlan } from '../plan/service';
import type { LessonKind, Mcq } from './content';
import { generateLesson, type LessonContent, type LessonRequest } from './generate';
import { gradeLessonWriting, scoreDictation, type DictationResult, type LessonWritingFeedback } from './grade';

const LESSON_KINDS: readonly Skill[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'];
const GENERATION_LOCK_MS = 90_000;

export type ShadowResult = { sentence: string; recognized: string; scores: Assessment['scores']; words: Assessment['words'] };
export type LessonResult = {
  correct: number | null;
  total: number | null;
  dictation: DictationResult[] | null;
  writing: { text: string; feedback: LessonWritingFeedback } | null;
  speaking: { transcript: string; seconds: number; scores: Assessment['scores'] | null; feedback: SpeakingFeedback | null; label: string | null } | null;
  cardsAdded: number;
  seconds: number;
};

export type LessonDoc = {
  userId: ObjectId;
  taskId: string;
  planCreatedAt: Date;
  date: string;
  kind: LessonKind;
  level: number;
  topic: string;
  minutes: number;
  status: 'generating' | 'ready' | 'completed';
  lockedAt: Date | null;
  content: LessonContent | null;
  shadowing: (ShadowResult | null)[];
  result: LessonResult | null;
  createdAt: Date;
  completedAt: Date | null;
};

const lessons = (db: Db) => db.collection<LessonDoc>('lessons');

export function publicLesson(l: WithId<LessonDoc>) {
  return {
    id: l._id.toHexString(),
    taskId: l.taskId,
    date: l.date,
    kind: l.kind,
    level: l.level,
    levelName: levelLabel(l.level),
    topic: l.topic,
    minutes: l.minutes,
    status: l.status,
    content: l.content,
    shadowing: l.shadowing,
    result: l.result,
  };
}
export type PublicLesson = ReturnType<typeof publicLesson>;

async function findTask(db: Db, user: WithId<UserDoc>, taskId: string) {
  const plan = await activePlan(db, user._id);
  if (!plan) throw new HttpError(409, 'Build your plan first.', 'no_plan');
  for (const w of plan.plan.weeks)
    for (const d of w.days)
      for (const t of d.tasks) if (t.id === taskId) return { plan, day: d, task: t as Task };
  throw new HttpError(404, 'That lesson is not in your current plan.', 'not_found');
}

/**
 * Opens the lesson for a plan task, writing it with Gemini the first time. Returns `generating` while
 * another request is writing the same lesson, so double taps never pay twice.
 */
export async function openLesson(db: Db, user: WithId<UserDoc>, taskId: string, now = new Date(), rng: () => number = Math.random) {
  const existing = await lessons(db).findOne({ userId: user._id, taskId });
  if (existing && existing.status !== 'generating') return { status: 'ready' as const, lesson: publicLesson(existing) };

  const { plan, day, task } = await findTask(db, user, taskId);
  if (!LESSON_KINDS.includes(task.kind as Skill)) throw new HttpError(400, 'This task is not a lesson.', 'not_a_lesson');
  const today = localDate(user.timezone, now);
  if (day.date > addDays(today, 1)) throw new HttpError(409, 'This lesson opens on its day. Finish today’s lessons first.', 'too_early');
  if (!isGeminiConfigured()) throw new ConfigError('GEMINI_API_KEY');

  // Take the writing lock: insert a placeholder, or take over one that has been stuck for too long.
  const lockCutoff = new Date(now.getTime() - GENERATION_LOCK_MS);
  const base: LessonDoc = {
    userId: user._id,
    taskId,
    planCreatedAt: plan.createdAt,
    date: day.date,
    kind: task.kind as LessonKind,
    level: task.level ?? 3,
    topic: task.topic ?? task.title,
    minutes: task.minutes,
    status: 'generating',
    lockedAt: now,
    content: null,
    shadowing: [],
    result: null,
    createdAt: now,
    completedAt: null,
  };
  let locked = false;
  if (!existing) {
    try {
      await lessons(db).insertOne(base);
      locked = true;
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  } else {
    const r = await lessons(db).updateOne({ _id: existing._id, status: 'generating', lockedAt: { $lt: lockCutoff } }, { $set: { lockedAt: now } });
    locked = r.modifiedCount === 1;
  }
  if (!locked) return { status: 'generating' as const, lesson: null };

  const request: LessonRequest = { kind: base.kind, level: Math.max(1, Math.min(6, base.level)), topic: base.topic, goal: plan.settings.goal, minutes: base.minutes };
  try {
    const content = await generateLesson(request, rng);
    const saved = await lessons(db).findOneAndUpdate(
      { userId: user._id, taskId },
      { $set: { content, status: 'ready', lockedAt: null, shadowing: content.kind === 'speaking' ? content.shadowing.map(() => null) : [] } },
      { returnDocument: 'after' },
    );
    return { status: 'ready' as const, lesson: publicLesson(saved!) };
  } catch (e) {
    // Release the lock so the learner can try again straight away.
    await lessons(db).updateOne({ userId: user._id, taskId, status: 'generating' }, { $set: { lockedAt: new Date(0) } });
    throw e;
  }
}

async function ownLesson(db: Db, user: WithId<UserDoc>, lessonId: unknown) {
  if (typeof lessonId !== 'string' || !ObjectId.isValid(lessonId)) throw new HttpError(404, 'That lesson was not found.', 'not_found');
  const l = await lessons(db).findOne({ _id: new ObjectId(lessonId), userId: user._id });
  if (!l || !l.content) throw new HttpError(404, 'That lesson was not found.', 'not_found');
  return l as WithId<LessonDoc> & { content: LessonContent };
}

const mcqCard = (lessonId: string, skill: string, i: number, q: Mcq, chosen: number, extra: Partial<NewCard['front']> = {}, transcript: string | null = null): NewCard => ({
  key: `lesson:${lessonId}:${i}`,
  skill,
  lessonId,
  front: {
    prompt: q.prompt,
    passage: null,
    lines: null,
    instruction: q.prompt.includes('___') ? 'Say the missing word or phrase.' : 'Answer the question.',
    ...extra,
  },
  back: { answer: q.options[q.answer], explanation: q.explanation, yourAnswer: q.options[chosen] ?? null, transcript },
});

async function finish(db: Db, l: WithId<LessonDoc>, result: LessonResult, now: Date) {
  const r = await lessons(db).findOneAndUpdate(
    { _id: l._id, status: { $ne: 'completed' } },
    { $set: { status: 'completed', result, completedAt: now } },
    { returnDocument: 'after' },
  );
  if (!r) throw new HttpError(409, 'This lesson is already finished.', 'stale');
  return publicLesson(r);
}

/**
 * Finishes a grammar, vocabulary, reading or listening lesson. `answers` are the option indexes chosen
 * for each question; `dictation` is what the learner typed for each dictation sentence.
 */
export async function completeLesson(
  db: Db,
  user: WithId<UserDoc>,
  input: { lessonId: unknown; answers: number[]; dictation?: string[]; seconds: number },
  now = new Date(),
) {
  const l = await ownLesson(db, user, input.lessonId);
  if (l.status === 'completed') return publicLesson(l);
  const c = l.content;
  if (c.kind === 'writing' || c.kind === 'speaking') throw new HttpError(400, 'Use the writing or speaking answer for this lesson.', 'wrong_kind');
  const questions = c.kind === 'grammar' || c.kind === 'vocabulary' ? c.practice : c.questions;
  if (input.answers.length !== questions.length) throw new HttpError(400, 'Answer every question first.', 'incomplete');

  const id = l._id.toHexString();
  const cards: NewCard[] = [];
  let correct = 0;
  questions.forEach((q, i) => {
    if (input.answers[i] === q.answer) correct++;
    else
      cards.push(
        mcqCard(
          id,
          c.kind,
          i,
          q,
          input.answers[i],
          c.kind === 'reading' ? { passage: { title: c.title, text: c.text } } : c.kind === 'listening' ? { lines: c.lines, instruction: 'Listen, then answer.' } : {},
          c.kind === 'listening' ? c.lines.map((x) => `${x.speaker}: ${x.text}`).join('\n') : null,
        ),
      );
  });

  let dictation: DictationResult[] | null = null;
  if (c.kind === 'listening') {
    const typed = input.dictation ?? [];
    if (typed.length !== c.dictation.length) throw new HttpError(400, 'Type each dictation sentence first.', 'incomplete');
    dictation = c.dictation.map((s, i) => scoreDictation(s, typed[i] ?? ''));
    dictation.forEach((d, i) => {
      if (d.accuracy < 100)
        cards.push({
          key: `lesson:${id}:dictation:${i}`,
          skill: 'listening',
          lessonId: id,
          front: { prompt: 'Listen and say the sentence.', passage: null, lines: [{ speaker: 'A', text: d.sentence }], instruction: 'Listen, then say or write what you heard.' },
          back: { answer: d.sentence, explanation: `You missed: ${d.words.filter((w) => !w.ok).map((w) => w.word).join(', ') || 'a few words'}.`, yourAnswer: d.typed || null, transcript: null },
        });
    });
  }

  // New vocabulary always becomes cards, keyed by the word, so it is learned once across lessons.
  if (c.kind === 'vocabulary')
    for (const w of c.words) {
      const gapped = w.example.replace(new RegExp(`\\b${w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i'), '___');
      cards.push({
        key: `word:${w.word.trim().toLowerCase()}`,
        skill: 'vocabulary',
        lessonId: id,
        front: { prompt: gapped.includes('___') ? gapped : `${w.meaning} ___`, passage: null, lines: null, instruction: `Say the word that means: ${w.meaning}` },
        back: { answer: w.word, explanation: `${w.partOfSpeech}. ${w.meaning}. Common phrase: ${w.collocation}.`, yourAnswer: null, transcript: null },
      });
    }

  const cardsAdded = await addLessonCards(db, user._id, cards, now);
  return finish(db, l, { correct, total: questions.length, dictation, writing: null, speaking: null, cardsAdded, seconds: Math.max(0, Math.round(input.seconds)) }, now);
}

export async function submitLessonWriting(db: Db, user: WithId<UserDoc>, input: { lessonId: unknown; text: string; seconds: number }, now = new Date()) {
  const l = await ownLesson(db, user, input.lessonId);
  if (l.status === 'completed') return publicLesson(l);
  const c = l.content;
  if (c.kind !== 'writing') throw new HttpError(400, 'This is not a writing lesson.', 'wrong_kind');
  const text = input.text.trim();
  if (text.split(/\s+/).filter(Boolean).length < 5) throw new HttpError(400, 'Write a few sentences first.', 'too_short');
  if (!isGeminiConfigured()) throw new ConfigError('GEMINI_API_KEY');
  const feedback = await gradeLessonWriting(c.task, text, l.level);
  const id = l._id.toHexString();
  const cardsAdded = await addLessonCards(
    db,
    user._id,
    feedback.corrections.map((x, i) => ({
      key: `lesson:${id}:fix:${i}`,
      skill: 'writing',
      lessonId: id,
      front: { prompt: x.original, passage: null, lines: null, instruction: 'Correct this phrase from your writing.' },
      back: { answer: x.corrected, explanation: x.note, yourAnswer: null, transcript: null },
    })),
    now,
  );
  return finish(db, l, { correct: null, total: null, dictation: null, writing: { text, feedback }, speaking: null, cardsAdded, seconds: Math.round(input.seconds) }, now);
}

/** Scores one shadowing sentence against the model sentence. Saved, so leaving the lesson keeps progress. */
export async function scoreShadowing(db: Db, user: WithId<UserDoc>, input: { lessonId: unknown; index: number; wav: Buffer }) {
  const l = await ownLesson(db, user, input.lessonId);
  const c = l.content;
  if (c.kind !== 'speaking') throw new HttpError(400, 'This is not a speaking lesson.', 'wrong_kind');
  const sentence = c.shadowing[input.index];
  if (sentence === undefined) throw new HttpError(400, 'That sentence does not exist.', 'invalid_index');
  if (!isSpeechConfigured()) throw new ConfigError('AZURE_SPEECH_KEY');
  const a = await assessPronunciation(input.wav, sentence);
  if (a.status !== 'Success') throw new HttpError(422, "We couldn't hear any speech. Hold the phone closer and try again.", 'no_speech');
  const result: ShadowResult = { sentence, recognized: a.recognized, scores: a.scores, words: a.words };
  await lessons(db).updateOne({ _id: l._id }, { $set: { [`shadowing.${input.index}`]: result } });
  return result;
}

/** Scores the free answer (Azure for pronunciation and fluency, Gemini for language) and finishes the lesson. */
export async function submitTalk(db: Db, user: WithId<UserDoc>, input: { lessonId: unknown; wav: Buffer; seconds: number; lessonSeconds: number }, now = new Date()) {
  const l = await ownLesson(db, user, input.lessonId);
  if (l.status === 'completed') return publicLesson(l);
  const c = l.content;
  if (c.kind !== 'speaking') throw new HttpError(400, 'This is not a speaking lesson.', 'wrong_kind');
  if (!isSpeechConfigured()) throw new ConfigError('AZURE_SPEECH_KEY');
  const a = await assessSpontaneous(input.wav);
  if (a.status !== 'Success' || !a.recognized.trim()) throw new HttpError(422, "We couldn't hear any speech. Hold the phone closer and try again.", 'no_speech');
  const graded = await gradeSpeaking([{ prompt: c.question, seconds: input.seconds, assessment: a }], [l.level]);
  // Words the learner mispronounced in shadowing become cards to practise saying.
  const id = l._id.toHexString();
  const weak = (l.shadowing ?? []).flatMap((s, i) => (s && (s.scores.pronunciation ?? 100) < 75 ? [{ s, i }] : []));
  const cardsAdded = await addLessonCards(
    db,
    user._id,
    weak.map(({ s, i }) => ({
      key: `lesson:${id}:shadow:${i}`,
      skill: 'speaking',
      lessonId: id,
      front: { prompt: s.sentence, passage: null, lines: [{ speaker: 'A', text: s.sentence }], instruction: 'Listen, then say this sentence aloud.' },
      back: {
        answer: s.sentence,
        explanation: `Practise: ${s.words.filter((w) => w.errorType !== 'None' || (w.accuracy ?? 100) < 60).map((w) => w.word).join(', ') || 'the rhythm of the sentence'}.`,
        yourAnswer: null,
        transcript: null,
      },
    })),
    now,
  );
  return finish(
    db,
    l,
    {
      correct: null,
      total: null,
      dictation: null,
      writing: null,
      speaking: { transcript: a.recognized, seconds: input.seconds, scores: a.scores, feedback: graded.feedback, label: graded.feedback ? graded.result.label : null },
      cardsAdded,
      seconds: Math.round(input.lessonSeconds),
    },
    now,
  );
}

/** Task ids of the plan's finished lessons, for ticking them off on Today and in the Plan tab. */
export async function doneTaskIds(db: Db, userId: ObjectId, planCreatedAt: Date): Promise<string[]> {
  const list = await lessons(db).find({ userId, planCreatedAt, status: 'completed' }, { projection: { taskId: 1 } }).toArray();
  return list.map((l) => l.taskId);
}
