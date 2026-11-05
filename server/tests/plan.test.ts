import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db, type WithId } from 'mongodb';

import type { UserDoc } from '@/lib/auth';
import { importPlacementCards, reviewCard, sessionCards } from '@/lib/cards';
import { addDays, daysBetween, localDate, shortInterval } from '@/lib/dates';
import { ensureIndexes } from '@/lib/db';
import { SKILLS } from '@/lib/plan/content';
import { PLAN_WEEKS, buildPlan, estimate, newCardsPerDay, strandMinutes, type Levels, type Settings } from '@/lib/plan/engine';
import { activePlan, createPlan, locate, todaySummary } from '@/lib/plan/service';

const levels: Levels = { grammar: 3, vocabulary: 3.5, reading: 4, listening: 3, writing: 2, speaking: 2.5 };
const settings: Settings = { goal: 'work', target: 4, minutes: 30, days: 5 };

describe('dates in the learner’s time zone', () => {
  it('uses the local calendar day, not UTC', () => {
    const lateUtc = new Date('2026-11-05T21:30:00Z'); // 01:30 on the 6th in Dubai
    expect(localDate('Asia/Dubai', lateUtc)).toBe('2026-11-06');
    expect(localDate('America/New_York', lateUtc)).toBe('2026-11-05');
    expect(localDate('Not/AZone', lateUtc)).toBe('2026-11-05');
  });
  it('adds days and counts between dates across month ends', () => {
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02');
    expect(daysBetween('2026-11-29', '2026-12-02')).toBe(3);
  });
  it('formats review intervals briefly', () => {
    expect(shortInterval(30_000)).toBe('<1m');
    expect(shortInterval(10 * 60_000)).toBe('10m');
    expect(shortInterval(3 * 86_400_000)).toBe('3d');
    expect(shortInterval(90 * 86_400_000)).toBe('3mo');
  });
});

describe('the 12-week plan', () => {
  const plan = buildPlan(settings, levels, '2026-11-05');
  const days = plan.weeks.flatMap((w) => w.days);

  it('covers 12 weeks of consecutive days from the start date', () => {
    expect(plan.weeks).toHaveLength(PLAN_WEEKS);
    expect(days).toHaveLength(84);
    days.forEach((d, i) => expect(d.date).toBe(addDays('2026-11-05', i)));
  });

  it('gives each week the chosen number of study days, a weekly review, and rest days', () => {
    for (const w of plan.weeks) {
      expect(w.days.filter((d) => d.type === 'study')).toHaveLength(4);
      expect(w.days.filter((d) => d.type === 'review' || d.type === 'checkpoint')).toHaveLength(1);
      expect(w.days.filter((d) => d.type === 'rest')).toHaveLength(2);
    }
  });

  it('ends every fourth week with a checkpoint test', () => {
    const checkpoints = plan.weeks.filter((w) => w.days.some((d) => d.type === 'checkpoint')).map((w) => w.n);
    expect(checkpoints).toEqual([4, 8, 12]);
  });

  it('fits each study day into the chosen minutes, starting with review cards', () => {
    for (const d of days.filter((x) => x.type !== 'rest')) {
      const total = d.tasks.reduce((a, t) => a + t.minutes, 0);
      expect(d.tasks[0].kind).toBe('review');
      expect(total).toBeLessThanOrEqual(settings.minutes + (d.type === 'checkpoint' ? 10 : 0));
      expect(total).toBeGreaterThanOrEqual(settings.minutes - 7);
    }
  });

  it('never repeats a skill within a day', () => {
    for (const d of days) {
      const kinds = d.tasks.map((t) => t.kind);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });

  it('gives the weakest skill the most time and still covers all four strands', () => {
    const minutes: Record<string, number> = {};
    for (const d of days) for (const t of d.tasks) minutes[t.kind] = (minutes[t.kind] ?? 0) + t.minutes;
    const lessonSkills = SKILLS.map((s) => s.key);
    const top = [...lessonSkills].sort((a, b) => (minutes[b] ?? 0) - (minutes[a] ?? 0))[0];
    expect(top).toBe('writing');
    expect(plan.focusSkills[0]).toBe('writing');
    for (const k of lessonSkills) expect(minutes[k] ?? 0, k).toBeGreaterThan(0);
    const strands = strandMinutes(plan);
    for (const s of ['language', 'input', 'output', 'fluency'] as const) expect(strands[s], s).toBeGreaterThan(0);
  });

  it('keeps each of the four strands between 15% and 40% of lesson time, and weights the weakest skill about 3:1', () => {
    const strand: Record<string, number> = {};
    const skill: Record<string, number> = {};
    for (const d of days)
      for (const t of d.tasks)
        if (t.strand) {
          strand[t.strand] = (strand[t.strand] ?? 0) + t.minutes;
          skill[t.kind] = (skill[t.kind] ?? 0) + t.minutes;
        }
    const total = Object.values(strand).reduce((a, b) => a + b, 0);
    for (const s of ['language', 'input', 'output', 'fluency']) {
      expect(strand[s] / total, s).toBeGreaterThan(0.15);
      expect(strand[s] / total, s).toBeLessThan(0.4);
    }
    expect(skill.writing / skill.reading).toBeGreaterThan(2);
  });

  it('keeps speaking at a fair share even for a beginner whose grammar and vocabulary are weakest', () => {
    const beginner = buildPlan({ ...settings, target: 2 }, { grammar: 0, vocabulary: 0, reading: 1, listening: 1, writing: 0.5, speaking: 0.9 }, '2026-11-05');
    const strands = strandMinutes(beginner);
    const total = Object.values(strands).reduce((a, b) => a + b, 0);
    expect(strands.fluency / total).toBeGreaterThan(0.15);
    expect(strands.language / total).toBeLessThan(0.4);
  });

  it('fits a 15-minute day into review plus one lesson', () => {
    const short = buildPlan({ ...settings, minutes: 15, days: 7 }, levels, '2026-11-05');
    const day = short.weeks[0].days[0];
    expect(day.tasks.map((t) => t.minutes)).toEqual([5, 10]);
    expect(short.weeks[0].days.filter((d) => d.type === 'rest')).toHaveLength(0);
  });

  it('estimates time to the target from 200 hours per level', () => {
    expect(estimate({ target: 4, minutes: 30, days: 5 }, 3)).toMatchObject({ hours: 200, hoursPerWeek: 2.5, weeks: 80, planHours: 30 });
    expect(estimate({ target: 4, minutes: 60, days: 5 }, 3.5).weeks).toBe(20);
    expect(estimate({ target: 3, minutes: 30, days: 5 }, 3.2).hours).toBe(0);
  });
});

describe('review cards and plans in the database', () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let user: WithId<UserDoc>;
  let testId: ObjectId;
  const now = new Date('2026-11-05T08:00:00Z');

  const MISTAKES = [
    ['g-b1-01', 'grammar'],
    ['g-b1-02', 'grammar'],
    ['v-b1-01', 'vocabulary'],
    ['r-b1-1-q1', 'reading'],
    ['l-b1-01', 'listening'],
    ['g-a2-01', 'grammar'],
    ['g-a2-02', 'grammar'],
    ['v-a2-01', 'vocabulary'],
    ['v-a2-02', 'vocabulary'],
    ['g-b2-01', 'grammar'],
    ['g-b2-02', 'grammar'],
    ['v-b2-01', 'vocabulary'],
  ];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongo.getUri());
    db = client.db('english_coach_plan_test');
    await ensureIndexes(db);
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    for (const c of ['users', 'placement_tests', 'cards', 'review_logs', 'plans']) await db.collection(c).deleteMany({});
    testId = new ObjectId();
    const doc = {
      email: 'learner@example.com',
      name: null,
      timezone: 'Asia/Dubai',
      emailOptIn: true,
      createdAt: now,
      lastLoginAt: now,
      placement: {
        testId: testId.toHexString(),
        completedAt: now,
        overall: { score: 3.2, label: 'B1' },
        skills: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { score: v, label: 'x', method: 'staircase' }])),
      },
    } as unknown as UserDoc;
    const { insertedId } = await db.collection<UserDoc>('users').insertOne(doc);
    user = { ...doc, _id: insertedId };
    await db.collection('placement_tests').insertOne({
      _id: testId,
      userId: insertedId,
      status: 'completed',
      results: {
        mistakes: MISTAKES.map(([itemId, section]) => ({ section, itemId, prompt: `Prompt ${itemId} ___`, chosen: 'wrong', correct: 'right', explanation: 'Because.', passageTitle: null, transcript: null })),
      },
      writing: { feedback: { corrections: [{ original: 'I have went', corrected: 'I went', note: 'Past simple.' }] } },
    });
  });

  it('makes one card per mistake and writing correction, and never duplicates them', async () => {
    expect(await importPlacementCards(db, user._id, testId, now)).toBe(13);
    expect(await importPlacementCards(db, user._id, testId, now)).toBe(0);
    const listening = await db.collection('cards').findOne({ key: 'placement:l-b1-01' });
    expect(listening?.front.lines.length).toBeGreaterThan(0);
    const reading = await db.collection('cards').findOne({ key: 'placement:r-b1-1-q1' });
    expect(reading?.front.passage.text.length).toBeGreaterThan(100);
  });

  it('introduces new cards gradually, up to the daily limit', async () => {
    await importPlacementCards(db, user._id, testId, now);
    const s = await sessionCards(db, user, newCardsPerDay(30), now);
    expect(newCardsPerDay(30)).toBe(10);
    expect(s.cards).toHaveLength(10);
    expect(s.counts).toMatchObject({ due: 0, newToday: 10, newWaiting: 13, total: 13 });
    expect(s.cards[0].intervals.again).toMatch(/m$/);
    // New cards alternate between skills rather than coming in blocks.
    expect(new Set(s.cards.slice(0, 4).map((c) => c.skill)).size).toBe(4);
    expect(s.cards[0].intervals.easy).toMatch(/d$/);
  });

  it('schedules a remembered card for later and brings a forgotten one back soon', async () => {
    await importPlacementCards(db, user._id, testId, now);
    const [a, b] = (await sessionCards(db, user, 10, now)).cards;
    const good = await reviewCard(db, user, { cardId: a.id, rating: 3, reps: a.reps }, now);
    expect(good.soon).toBe(false); // a new card's first "Good" waits 10 minutes, so it isn't repeated straight away
    const again = await reviewCard(db, user, { cardId: b.id, rating: 1, reps: b.reps }, now);
    expect(again.soon).toBe(true);
    const easy = await reviewCard(db, user, { cardId: good.card.id, rating: 4, reps: good.card.reps }, new Date(now.getTime() + 15 * 60_000));
    expect(easy.soon).toBe(false);
    expect(easy.due.getTime() - now.getTime()).toBeGreaterThan(86_400_000);

    const later = await sessionCards(db, user, 10, new Date(now.getTime() + 20 * 60_000));
    expect(later.cards.some((c) => c.id === b.id)).toBe(true);
    expect(later.cards.some((c) => c.id === a.id)).toBe(false);
    expect(later.counts.reviewedToday).toBe(3);
    // Two cards were introduced today, so only 8 more new ones are offered.
    expect(later.counts.newToday).toBe(8);
  });

  it('ignores a double tap on the same card', async () => {
    await importPlacementCards(db, user._id, testId, now);
    const [a] = (await sessionCards(db, user, 10, now)).cards;
    await reviewCard(db, user, { cardId: a.id, rating: 3, reps: a.reps }, now);
    await expect(reviewCard(db, user, { cardId: a.id, rating: 3, reps: a.reps }, now)).rejects.toMatchObject({ status: 409 });
    expect(await db.collection('review_logs').countDocuments()).toBe(1);
  });

  it('builds a plan from the latest result, imports cards, and replaces an older plan', async () => {
    await expect(createPlan(db, user, { ...settings, target: 3 }, now)).rejects.toMatchObject({ status: 400 });
    await expect(createPlan(db, user, { ...settings, minutes: 20 }, now)).rejects.toThrow();
    const first = await createPlan(db, user, settings, now);
    expect(first.plan.startDate).toBe('2026-11-05');
    expect(await db.collection('cards').countDocuments()).toBe(13);
    await createPlan(db, user, { ...settings, days: 3 }, now);
    expect(await db.collection('plans').countDocuments({ status: 'active' })).toBe(1);
    expect((await activePlan(db, user._id))?.settings.days).toBe(3);
  });

  it('refuses to build a plan before the placement test', async () => {
    await db.collection('users').updateOne({ _id: user._id }, { $unset: { placement: '' } });
    await expect(createPlan(db, user, settings, now)).rejects.toMatchObject({ status: 409 });
  });

  it('shows today’s tasks and card counts on Today, and knows when the plan has ended', async () => {
    const doc = await createPlan(db, user, settings, now);
    const t = await todaySummary(db, user, now);
    expect(t.date).toBe('2026-11-05');
    expect(t.plan).toMatchObject({ status: 'active', week: 1, dayOfWeek: 1, dayType: 'study' });
    expect(t.plan!.tasks[0].kind).toBe('review');
    expect(t.cards.newToday).toBe(10);
    expect(locate(doc, '2027-01-28').status).toBe('ended');
    expect(locate(doc, '2027-01-27').status).toBe('active');
  });
});
