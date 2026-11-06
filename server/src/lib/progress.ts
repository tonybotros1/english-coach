/**
 * Study activity, streaks, skill history and review-card statistics for the Progress screen, plus the
 * wording of the morning reminders the phone schedules.
 */
import type { Db, WithId } from 'mongodb';
import { State } from 'ts-fsrs';

import type { UserDoc } from './auth';
import { addDays, daysBetween, localDate } from './dates';
import { levelLabel } from './placement/levels';
import { SKILLS } from './plan/content';
import { newCardsPerDay, PLAN_WEEKS, type Task } from './plan/engine';
import { activePlan, locate } from './plan/service';
import { doneTaskIds } from './tasks';

/** Review time is the gap between ratings, capped so a break does not count as study. */
const REVIEW_GAP_CAP_S = 90;
const FIRST_REVIEW_S = 20;
const SESSION_BREAK_S = 600;
/** A card counts as learned once FSRS expects to keep it for three weeks or more. */
export const LEARNED_STABILITY_DAYS = 21;

type Minutes = Map<string, number>;

const addTo = (m: Minutes, date: string, minutes: number) => m.set(date, (m.get(date) ?? 0) + minutes);

/** Study minutes for each local date, from lessons, weekly reviews, tests and card reviews. */
export async function minutesByDay(db: Db, user: WithId<UserDoc>, since: Date): Promise<Minutes> {
  const tz = user.timezone;
  const [lessons, weeklies, tests, logs] = await Promise.all([
    db.collection('lessons').find({ userId: user._id, status: 'completed', completedAt: { $gte: since } }, { projection: { completedAt: 1, 'result.seconds': 1 } }).toArray(),
    db.collection('weekly_reviews').find({ userId: user._id, status: 'completed', completedAt: { $gte: since } }, { projection: { completedAt: 1, 'result.seconds': 1 } }).toArray(),
    db.collection('placement_tests').find({ userId: user._id, status: 'completed', completedAt: { $gte: since } }, { projection: { completedAt: 1, 'results.minutes': 1 } }).toArray(),
    db.collection('review_logs').find({ userId: user._id, reviewedAt: { $gte: since } }, { projection: { reviewedAt: 1 } }).sort({ reviewedAt: 1 }).toArray(),
  ]);
  const m: Minutes = new Map();
  for (const l of [...lessons, ...weeklies]) addTo(m, localDate(tz, l.completedAt), (l.result?.seconds ?? 0) / 60);
  for (const t of tests) addTo(m, localDate(tz, t.completedAt), t.results?.minutes ?? 0);
  let prev: Date | null = null;
  for (const r of logs) {
    const at = r.reviewedAt as Date;
    const gap = prev ? (at.getTime() - prev.getTime()) / 1000 : Infinity;
    addTo(m, localDate(tz, at), (gap > SESSION_BREAK_S ? FIRST_REVIEW_S : Math.min(gap, REVIEW_GAP_CAP_S)) / 60);
    prev = at;
  }
  return m;
}

/** Days in a row with any study, counting today if studied, otherwise up to yesterday. */
export function streakFrom(m: Minutes, today: string): number {
  let day = (m.get(today) ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((m.get(day) ?? 0) > 0) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export async function progressSummary(db: Db, user: WithId<UserDoc>, now = new Date()) {
  const today = localDate(user.timezone, now);
  const plan = await activePlan(db, user._id);
  // Weeks run from the plan's start date; without a plan, the last 6 weeks ending today.
  const weeksShown = 8;
  const where = plan ? locate(plan, today) : null;
  const currentWeek = plan && where ? (where.status === 'ended' ? PLAN_WEEKS - 1 : where.weekIndex) : 0;
  const weekStart = (i: number) => (plan ? addDays(plan.plan.startDate, i * 7) : addDays(today, -6 - (5 - i) * 7));
  const first = plan ? Math.max(0, currentWeek - weeksShown + 1) : 0;
  const last = plan ? currentWeek : 5;
  // A year of history is plenty for the streak and the weekly chart.
  const minutes = await minutesByDay(db, user, new Date(now.getTime() - 400 * 86_400_000));

  const weeks = [];
  for (let i = first; i <= last; i++) {
    const start = weekStart(i);
    let total = 0;
    for (let d = 0; d < 7; d++) total += minutes.get(addDays(start, d)) ?? 0;
    weeks.push({ label: plan ? `W${i + 1}` : start.slice(5), start, minutes: Math.round(total), target: plan ? plan.settings.minutes * plan.settings.days : null, current: plan ? i === currentWeek : i === last });
  }

  const tests = await db
    .collection('placement_tests')
    .find({ userId: user._id, status: 'completed' }, { projection: { completedAt: 1, kind: 1, results: 1 } })
    .sort({ completedAt: 1 })
    .toArray();
  const history = tests.map((t) => ({
    testId: String(t._id),
    date: localDate(user.timezone, t.completedAt),
    kind: (t.kind ?? 'placement') as 'placement' | 'checkpoint',
    overall: { score: t.results.overall.score as number, label: levelLabel(t.results.overall.score) },
    skills: Object.fromEntries(SKILLS.map((s) => [s.key, { score: t.results.skills[s.key].score as number, label: levelLabel(t.results.skills[s.key].score), method: t.results.skills[s.key].method as string }])),
  }));

  const cardsCol = db.collection('cards');
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
  const [total, fresh, learned, reviews30, recalled30, lessonsDone] = await Promise.all([
    cardsCol.countDocuments({ userId: user._id }),
    cardsCol.countDocuments({ userId: user._id, 'fsrs.state': State.New }),
    cardsCol.countDocuments({ userId: user._id, 'fsrs.state': State.Review, 'fsrs.stability': { $gte: LEARNED_STABILITY_DAYS } }),
    // Recall is measured on cards that were already learned (in review), as Anki's "retention" is.
    db.collection('review_logs').countDocuments({ userId: user._id, reviewedAt: { $gte: monthAgo }, state: State.Review }),
    db.collection('review_logs').countDocuments({ userId: user._id, reviewedAt: { $gte: monthAgo }, state: State.Review, rating: { $gte: 2 } }),
    plan ? doneTaskIds(db, user._id, plan.createdAt) : Promise.resolve([] as string[]),
  ]);
  const lessonTasks = plan ? plan.plan.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)).filter((t) => t.kind !== 'review') : [];

  return {
    today,
    streak: streakFrom(minutes, today),
    todayMinutes: Math.round(minutes.get(today) ?? 0),
    weeks,
    history,
    cards: { total, new: fresh, learned, learning: total - fresh - learned, reviews30, recall30: reviews30 ? Math.round((recalled30 / reviews30) * 100) : null },
    plan: plan ? { done: lessonTasks.filter((t) => lessonsDone.includes(t.id)).length, total: lessonTasks.length, week: currentWeek + 1, weeks: PLAN_WEEKS } : null,
  };
}

// ---------------- Morning reminders ----------------

const SKILL_NAME: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

function joinNames(list: string[]): string {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export type Reminder = { date: string; title: string; body: string };

/**
 * The text of the next `days` morning reminders, starting today. The phone schedules them, so they arrive
 * even when the app is closed; it asks again whenever it opens, so they stay up to date.
 */
export async function upcomingReminders(db: Db, user: WithId<UserDoc>, days = 7, now = new Date()): Promise<Reminder[]> {
  const today = localDate(user.timezone, now);
  const plan = await activePlan(db, user._id);
  const placement = await db.collection('users').findOne({ _id: user._id }, { projection: { placement: 1 } });
  const cardsCol = db.collection('cards');
  const newWaiting = await cardsCol.countDocuments({ userId: user._id, 'fsrs.state': State.New });
  const newPerDay = newCardsPerDay(plan?.settings.minutes ?? 30);
  const out: Reminder[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    // Cards due by the end of that day (an estimate for later days, since reviews move them), plus that day's new cards.
    const endOfDay = new Date(now.getTime() + (i + 1) * 86_400_000);
    const due = await cardsCol.countDocuments({ userId: user._id, 'fsrs.state': { $ne: State.New }, 'fsrs.due': { $lte: endOfDay } });
    const cards = due + Math.min(Math.max(0, newWaiting - i * newPerDay), newPerDay);
    const cardText = cards ? `${cards} review ${cards === 1 ? 'card' : 'cards'}` : null;

    if (!placement?.placement) {
      out.push({ date, title: 'Find your English level', body: 'Take the 30-minute placement test, and get a plan made for you.' });
      continue;
    }
    if (!plan) {
      out.push({ date, title: 'Build your study plan', body: 'Four quick choices turn your test results into a 12-week plan.' });
      continue;
    }
    const offset = daysBetween(plan.plan.startDate, date);
    if (offset >= PLAN_WEEKS * 7) {
      out.push({ date, title: 'Your 12 weeks are complete', body: 'Open the app to see your progress and plan your next steps.' });
      continue;
    }
    const day = plan.plan.weeks[Math.floor(offset / 7)]?.days[offset % 7];
    const tasks: Task[] = day?.tasks ?? [];
    const minutes = tasks.reduce((a, t) => a + t.minutes, 0);
    if (!day || day.type === 'rest') {
      out.push({ date, title: 'Rest day', body: cardText ? `Nothing planned today. ${cardText} ${cards === 1 ? 'is' : 'are'} ready if you have five minutes.` : 'Nothing planned today. Enjoy the break.' });
    } else if (day.type === 'checkpoint') {
      out.push({ date, title: 'Checkpoint test today', body: `15 minutes to see how far you've come${cardText ? `, plus ${cardText}` : ''}.` });
    } else if (day.type === 'review') {
      out.push({ date, title: 'Weekly review today', body: `${cardText ? `${cardText}, then ` : ''}a quick quiz on this week's lessons.` });
    } else {
      const lessons = tasks.filter((t) => t.kind in SKILL_NAME).map((t) => SKILL_NAME[t.kind]);
      out.push({ date, title: `Today: ${minutes} minutes of English`, body: `${cardText ? `${cardText}, then ` : ''}${joinNames(lessons) || 'your lessons'}.` });
    }
  }
  return out;
}
