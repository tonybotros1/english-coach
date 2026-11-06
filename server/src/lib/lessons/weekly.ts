/**
 * The weekly review: a short mixed quiz on the week's lessons, given after the due review cards.
 * Retesting earlier material, mixed across skills (retrieval practice and interleaving), is what research
 * shows makes learning stick. Questions missed during the week come first; some answered correctly are
 * mixed in, so the quiz checks they are still remembered.
 */
import type { Db, ObjectId, WithId } from 'mongodb';

import type { UserDoc } from '../auth';
import { addLessonCards } from '../cards';
import { addDays, localDate } from '../dates';
import { HttpError } from '../errors';
import { shuffle, type Rng } from '../placement/engine';
import { activePlan } from '../plan/service';
import { markTaskDone } from '../tasks';
import type { Mcq } from './content';
import type { LessonContent } from './generate';
import { mcqCard, type LessonDoc } from './service';

export const WEEKLY_QUESTIONS = 10;

export type WeeklyQuestion = Mcq & {
  skill: string;
  lessonId: string;
  index: number;
  missed: boolean;
  passage: { title: string; text: string } | null;
  lines: { speaker: 'A' | 'B'; text: string }[] | null;
};
type WeeklyDoc = {
  userId: ObjectId;
  planCreatedAt: Date;
  taskId: string;
  week: number;
  questions: WeeklyQuestion[];
  lessonsDone: number;
  status: 'ready' | 'completed';
  result: { correct: number; total: number; seconds: number; cardsAdded: number } | null;
  createdAt: Date;
  completedAt: Date | null;
};

const weeklies = (db: Db) => db.collection<WeeklyDoc>('weekly_reviews');

function questionsOf(l: WithId<LessonDoc>): WeeklyQuestion[] {
  const c = l.content as LessonContent | null;
  if (!c) return [];
  const list = c.kind === 'grammar' || c.kind === 'vocabulary' ? c.practice : c.kind === 'reading' || c.kind === 'listening' ? c.questions : [];
  const answers = l.result?.answers ?? [];
  return list.map((q, index) => ({
    ...q,
    skill: c.kind,
    lessonId: l._id.toHexString(),
    index,
    missed: answers[index] !== undefined && answers[index] !== q.answer,
    passage: c.kind === 'reading' ? { title: c.title, text: c.text } : null,
    lines: c.kind === 'listening' ? c.lines : null,
  }));
}

/** Picks the quiz: missed questions first, then correct ones, mixed across skills, with options in a new order. */
export function pickWeekly(pool: WeeklyQuestion[], rng: Rng, size = WEEKLY_QUESTIONS): WeeklyQuestion[] {
  const missed = shuffle(pool.filter((q) => q.missed), rng);
  const right = shuffle(pool.filter((q) => !q.missed), rng);
  // At least a third of the quiz rechecks things answered correctly, when there are enough.
  const keepRight = Math.min(right.length, Math.max(Math.ceil(size / 3), size - missed.length));
  const chosen = shuffle([...missed.slice(0, size - keepRight), ...right.slice(0, keepRight)], rng).slice(0, size);
  return chosen.map((q) => {
    const order = shuffle([0, 1, 2, 3], rng);
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  });
}

async function weeklyTask(db: Db, user: WithId<UserDoc>, taskId: string, now: Date) {
  const plan = await activePlan(db, user._id);
  if (!plan) throw new HttpError(409, 'Build your plan first.', 'no_plan');
  const weekIndex = plan.plan.weeks.findIndex((w) => w.days.some((d) => d.tasks.some((t) => t.id === taskId && t.kind === 'weekly')));
  if (weekIndex < 0) throw new HttpError(404, 'That weekly review is not in your current plan.', 'not_found');
  const day = plan.plan.weeks[weekIndex].days.find((d) => d.tasks.some((t) => t.id === taskId))!;
  if (day.date > addDays(localDate(user.timezone, now), 1)) throw new HttpError(409, 'The weekly review opens on its day.', 'too_early');
  return { plan, week: plan.plan.weeks[weekIndex], weekIndex };
}

export function publicWeekly(w: WithId<WeeklyDoc>) {
  return { id: w._id.toHexString(), taskId: w.taskId, week: w.week, questions: w.questions, lessonsDone: w.lessonsDone, status: w.status, result: w.result };
}

/** Opens the weekly review, building its quiz the first time from the week's finished lessons. */
export async function openWeekly(db: Db, user: WithId<UserDoc>, taskId: string, now = new Date(), rng: Rng = Math.random) {
  const existing = await weeklies(db).findOne({ userId: user._id, taskId });
  if (existing) return publicWeekly(existing);
  const { plan, week, weekIndex } = await weeklyTask(db, user, taskId, now);
  const taskIds = week.days.flatMap((d) => d.tasks.map((t) => t.id));
  const done = await db
    .collection<LessonDoc>('lessons')
    .find({ userId: user._id, planCreatedAt: plan.createdAt, status: 'completed', taskId: { $in: taskIds } })
    .toArray();
  const doc: WeeklyDoc = {
    userId: user._id,
    planCreatedAt: plan.createdAt,
    taskId,
    week: weekIndex + 1,
    questions: pickWeekly(done.flatMap(questionsOf), rng),
    lessonsDone: done.length,
    status: 'ready',
    result: null,
    createdAt: now,
    completedAt: null,
  };
  try {
    const { insertedId } = await weeklies(db).insertOne(doc);
    return publicWeekly({ ...doc, _id: insertedId });
  } catch (e) {
    // Opened twice at once: return the one that was saved first.
    if ((e as { code?: number }).code !== 11000) throw e;
    return publicWeekly((await weeklies(db).findOne({ userId: user._id, taskId }))!);
  }
}

/** Scores the quiz, turns missed questions into review cards (if they are not cards already) and ticks the task off. */
export async function completeWeekly(db: Db, user: WithId<UserDoc>, input: { taskId: string; answers: number[]; seconds: number }, now = new Date()) {
  const w = await weeklies(db).findOne({ userId: user._id, taskId: input.taskId });
  if (!w) throw new HttpError(404, 'Open the weekly review first.', 'not_found');
  if (w.status === 'completed') return publicWeekly(w);
  if (input.answers.length !== w.questions.length) throw new HttpError(400, 'Answer every question first.', 'incomplete');
  const wrong = w.questions.filter((q, i) => input.answers[i] !== q.answer);
  const cardsAdded = await addLessonCards(
    db,
    user._id,
    wrong.map((q) => {
      const i = w.questions.indexOf(q);
      return mcqCard(q.lessonId, q.skill, q.index, q, input.answers[i], q.passage ? { passage: q.passage } : q.lines ? { lines: q.lines, instruction: 'Listen, then answer.' } : {});
    }),
    now,
  );
  const result = { correct: w.questions.length - wrong.length, total: w.questions.length, seconds: Math.max(0, Math.round(input.seconds)), cardsAdded };
  const saved = await weeklies(db).findOneAndUpdate({ _id: w._id, status: 'ready' }, { $set: { status: 'completed', result, completedAt: now } }, { returnDocument: 'after' });
  await markTaskDone(db, user._id, w.planCreatedAt, w.taskId, now);
  return publicWeekly(saved ?? { ...w, status: 'completed', result, completedAt: now });
}
