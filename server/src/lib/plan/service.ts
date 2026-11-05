/** Stored plans and the Today summary. A learner has one active plan; building a new one archives the old. */
import { ObjectId, type Db, type WithId } from 'mongodb';
import { z } from 'zod';

import type { UserDoc } from '../auth';
import { cardCounts, importPlacementCards } from '../cards';
import { addDays, daysBetween, localDate } from '../dates';
import { HttpError } from '../errors';
import { doneTaskIds } from '../lessons/service';
import { currentStep, latestSummary, type PlacementSummary } from '../placement/service';
import { GOALS, SKILLS, type Goal } from './content';
import { MINUTE_CHOICES, PLAN_WEEKS, buildPlan, estimate, newCardsPerDay, strandMinutes, type Levels, type Plan, type Settings } from './engine';

export type PlanDoc = {
  userId: ObjectId;
  status: 'active' | 'archived';
  createdAt: Date;
  settings: Settings;
  placementTestId: string;
  levels: Levels;
  overall: number;
  plan: Plan;
};

const plans = (db: Db) => db.collection<PlanDoc>('plans');

export const settingsSchema = z
  .object({
    goal: z.enum(Object.keys(GOALS) as [Goal, ...Goal[]], { error: 'Choose a goal.' }),
    target: z.number().int().min(1).max(6),
    minutes: z.union(MINUTE_CHOICES.map((m) => z.literal(m)) as unknown as [z.ZodLiteral<15>, z.ZodLiteral<30>, z.ZodLiteral<45>, z.ZodLiteral<60>], { error: 'Choose 15, 30, 45 or 60 minutes.' }),
    days: z.number().int().min(3, { error: 'Choose 3 to 7 days a week.' }).max(7, { error: 'Choose 3 to 7 days a week.' }),
  })
  .strict();

const levelsFrom = (p: PlacementSummary): Levels => Object.fromEntries(SKILLS.map((s) => [s.key, p.skills[s.key].score])) as Levels;

/** The target one level above the current overall level, capped at C2. */
export const suggestedTarget = (overall: number) => Math.min(6, Math.floor(overall + 1e-9) + 1);

export async function activePlan(db: Db, userId: ObjectId) {
  return plans(db).findOne({ userId, status: 'active' }, { sort: { createdAt: -1 } });
}

export async function createPlan(db: Db, user: WithId<UserDoc>, raw: unknown, now = new Date()) {
  const settings = settingsSchema.parse(raw);
  const placement = await latestSummary(db, user._id);
  if (!placement) throw new HttpError(409, 'Take the placement test first, so the plan can match your level.', 'no_placement');
  if (settings.target <= Math.floor(placement.overall.score + 1e-9) && settings.target < 6)
    throw new HttpError(400, 'Choose a target above your current level.', 'target_too_low');

  const levels = levelsFrom(placement);
  const plan = buildPlan(settings, levels, localDate(user.timezone, now));
  await plans(db).updateMany({ userId: user._id, status: 'active' }, { $set: { status: 'archived' } });
  const doc: PlanDoc = { userId: user._id, status: 'active', createdAt: now, settings, placementTestId: placement.testId, levels, overall: placement.overall.score, plan };
  await plans(db).insertOne(doc);
  // Learners who took the test before review cards existed get their cards now.
  if (ObjectId.isValid(placement.testId)) await importPlacementCards(db, user._id, new ObjectId(placement.testId), now);
  return doc;
}

/** Where today falls in the plan: week and day, or past the end. */
export function locate(doc: PlanDoc, today: string) {
  const offset = daysBetween(doc.plan.startDate, today);
  if (offset < 0) return { status: 'not_started' as const, weekIndex: 0, dayIndex: 0, day: null, week: null };
  if (offset >= PLAN_WEEKS * 7) return { status: 'ended' as const, weekIndex: PLAN_WEEKS - 1, dayIndex: 6, day: null, week: null };
  const weekIndex = Math.floor(offset / 7);
  const week = doc.plan.weeks[weekIndex];
  return { status: 'active' as const, weekIndex, dayIndex: offset % 7, week, day: week.days[offset % 7] };
}

export function planView(doc: PlanDoc, today: string, done: string[] = []) {
  const where = locate(doc, today);
  return {
    done,
    createdAt: doc.createdAt,
    settings: doc.settings,
    goalName: GOALS[doc.settings.goal],
    overall: doc.overall,
    levels: doc.levels,
    estimate: estimate(doc.settings, doc.overall),
    focusSkills: doc.plan.focusSkills,
    strands: strandMinutes(doc.plan),
    startDate: doc.plan.startDate,
    endDate: addDays(doc.plan.startDate, PLAN_WEEKS * 7 - 1),
    weeks: doc.plan.weeks,
    today: { date: today, status: where.status, weekIndex: where.weekIndex, dayIndex: where.dayIndex },
  };
}

/** Defaults for the setup screen, from the latest placement result. */
export function setupDefaults(p: PlacementSummary) {
  const target = suggestedTarget(p.overall.score);
  return { overall: p.overall, skills: p.skills, target, minTarget: Math.min(6, Math.floor(p.overall.score + 1e-9) + 1), goal: 'work' as Goal, minutes: 30, days: 5 };
}

/** Everything the Today screen needs in one request. */
export async function todaySummary(db: Db, user: WithId<UserDoc>, now = new Date()) {
  const today = localDate(user.timezone, now);
  const [placement, active, doc] = await Promise.all([latestSummary(db, user._id), currentStep(db, user, now), activePlan(db, user._id)]);
  const minutes = doc?.settings.minutes ?? 30;
  const cards = await cardCounts(db, user, newCardsPerDay(minutes), now);
  const where = doc ? locate(doc, today) : null;
  const done = doc ? await doneTaskIds(db, user._id, doc.createdAt) : [];
  return {
    date: today,
    placement: { latest: placement, active },
    plan: doc && where
      ? {
          status: where.status,
          week: where.weekIndex + 1,
          weeks: PLAN_WEEKS,
          dayOfWeek: where.dayIndex + 1,
          dayType: where.day?.type ?? null,
          focus: where.week?.focus ?? null,
          tasks: where.day?.tasks ?? [],
          done: (where.day?.tasks ?? []).filter((t) => done.includes(t.id)).map((t) => t.id),
          target: doc.settings.target,
          minutes: doc.settings.minutes,
        }
      : null,
    cards,
  };
}
