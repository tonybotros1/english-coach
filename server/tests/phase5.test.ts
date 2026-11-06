import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db, type WithId } from 'mongodb';
import { State } from 'ts-fsrs';

import type { UserDoc } from '@/lib/auth';
import { addDays } from '@/lib/dates';
import { ensureIndexes } from '@/lib/db';
import { completeWeekly, openWeekly, pickWeekly, type WeeklyQuestion } from '@/lib/lessons/weekly';
import { pendingItem } from '@/lib/placement/engine';
import { answerQuestion, startTest, submitSpeaking, submitWriting, type Step, type TestDoc } from '@/lib/placement/service';
import type { Levels } from '@/lib/plan/engine';
import { activePlan, createPlan, todaySummary } from '@/lib/plan/service';
import { minutesByDay, progressSummary, streakFrom, upcomingReminders } from '@/lib/progress';
import { GRAMMAR, VOCABULARY } from './fixtures/lessons';

const addDays_ = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function seeded(seed = 11) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('the weekly quiz picker', () => {
  const q = (i: number, missed: boolean): WeeklyQuestion => ({
    prompt: `Q${i} ___`,
    options: ['a', 'b', 'c', 'd'],
    answer: 0,
    explanation: 'x',
    skill: 'grammar',
    lessonId: 'l',
    index: i,
    missed,
    passage: null,
    lines: null,
  });

  it('puts missed questions first but always rechecks some answered correctly', () => {
    const pool = [...Array.from({ length: 12 }, (_, i) => q(i, true)), ...Array.from({ length: 12 }, (_, i) => q(100 + i, false))];
    const picked = pickWeekly(pool, seeded());
    expect(picked).toHaveLength(10);
    expect(picked.filter((x) => !x.missed).length).toBe(4);
    for (const p of picked) expect(p.options[p.answer]).toBe('a');
  });

  it('fills the quiz with correct ones when few were missed, and copes with a small week', () => {
    const picked = pickWeekly([q(1, true), q(2, false), q(3, false)], seeded());
    expect(picked).toHaveLength(3);
    expect(pickWeekly([], seeded())).toEqual([]);
  });
});

describe('streaks', () => {
  it('counts days in a row, including today only once studied', () => {
    const m = new Map([
      ['2026-11-03', 10],
      ['2026-11-04', 5],
      ['2026-11-05', 12],
    ]);
    expect(streakFrom(m, '2026-11-05')).toBe(3);
    expect(streakFrom(m, '2026-11-06')).toBe(3);
    expect(streakFrom(m, '2026-11-07')).toBe(0);
  });
});

describe('checkpoints, weekly reviews, progress and reminders', () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let user: WithId<UserDoc>;
  const start = new Date('2026-11-05T06:00:00Z'); // 10:00 in Dubai
  const levels: Levels = { grammar: 3, vocabulary: 3, reading: 3, listening: 3, writing: 2, speaking: 2 };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongo.getUri());
    db = client.db('english_coach_phase5_test');
    await ensureIndexes(db);
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    for (const c of ['users', 'plans', 'lessons', 'cards', 'placement_tests', 'review_logs', 'task_done', 'weekly_reviews']) await db.collection(c).deleteMany({});
    delete process.env.GEMINI_API_KEY;
    delete process.env.AZURE_SPEECH_KEY;
    const testId = new ObjectId();
    const doc = {
      email: 'learner@example.com',
      name: null,
      timezone: 'Asia/Dubai',
      emailOptIn: true,
      createdAt: start,
      lastLoginAt: start,
      placement: {
        testId: testId.toHexString(),
        completedAt: start,
        overall: { score: 2.7, label: 'A2+' },
        skills: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { score: v, label: 'x', method: 'staircase' }])),
      },
    } as unknown as UserDoc;
    const { insertedId } = await db.collection<UserDoc>('users').insertOne(doc);
    user = { ...doc, _id: insertedId };
    // The original placement test, so the skill history has a first entry.
    await db.collection('placement_tests').insertOne({
      _id: testId,
      userId: insertedId,
      status: 'completed',
      // Taken a week earlier, so its minutes do not count towards this week's activity.
      completedAt: new Date('2026-10-29T06:00:00Z'),
      kind: 'placement',
      writing: null,
      results: { overall: { score: 2.7 }, skills: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { score: v, method: 'staircase' }])), minutes: 30, mistakes: [] },
    });
  });

  async function answerAll(step: Step, ability: number): Promise<Step> {
    let guard = 0;
    while (step.kind === 'mcq' && guard++ < 100) {
      const t = (await db.collection<TestDoc>('placement_tests').findOne({ _id: new ObjectId(step.testId) }))!;
      const { block, index } = pendingItem(t.stairs[step.section as 'grammar']!)!;
      const correctPos = block.orders[index].indexOf(0);
      step = await answerQuestion(db, user, { testId: step.testId, itemId: step.item.id, choice: block.level <= ability ? correctPos : (correctPos + 1) % 4 }, seeded(guard));
    }
    return step;
  }

  it('runs a short checkpoint from the current levels, then rebuilds the rest of the plan', async () => {
    const plan = await createPlan(db, user, { goal: 'work', target: 4, minutes: 30, days: 5 }, start);
    const checkpointTask = plan.plan.weeks[3].days.flatMap((d) => d.tasks).find((t) => t.kind === 'checkpoint')!;
    const day = plan.plan.weeks[3].days.find((d) => d.tasks.includes(checkpointTask))!;
    const at = new Date(`${day.date}T06:00:00Z`);
    const week2Before = JSON.stringify(plan.plan.weeks[1]);

    let step = await startTest(db, user, { checkpointTaskId: checkpointTask.id }, seeded(), at);
    const t = (await db.collection<TestDoc>('placement_tests').findOne({ _id: new ObjectId(step.testId) }))!;
    expect(t.kind).toBe('checkpoint');
    expect(t.stairs.grammar!.level).toBe(3); // starts at the learner's level, not always B1
    step = await answerAll(step, 4);
    expect(step.kind).toBe('writing');
    step = await submitWriting(db, user, { testId: step.testId, text: 'I work in a bank and I like my job very much.' }, seeded(), at);
    expect(step).toMatchObject({ kind: 'speaking', taskCount: 1 });
    step = await submitSpeaking(db, user, { testId: step.testId, taskIndex: 0, skip: true, wav: null, seconds: 0 }, seeded(), at);
    expect(step.kind).toBe('done');

    const after = (await activePlan(db, user._id))!;
    expect(after.levels.grammar).toBe(4);
    expect(after.checkpoints).toHaveLength(1);
    // Weeks already lived stay as they were; the weeks after the checkpoint are rebuilt.
    expect(JSON.stringify(after.plan.weeks[1])).toBe(week2Before);
    expect(after.plan.weeks[4].days.flatMap((d) => d.tasks).some((tk) => tk.kind === 'grammar' && tk.level === 4)).toBe(true);
    const today = await todaySummary(db, user, at);
    expect(today.plan?.done).toContain(checkpointTask.id);

    const progress = await progressSummary(db, user, at);
    expect(progress.history.map((h) => h.kind)).toEqual(['placement', 'checkpoint']);
    expect(progress.history[1].skills.grammar.label).toBe('B2');
  });

  it('builds the weekly quiz from the week’s lessons and ticks the review off', async () => {
    const plan = await createPlan(db, user, { goal: 'work', target: 4, minutes: 30, days: 5 }, start);
    const week = plan.plan.weeks[0];
    const weeklyTask = week.days.flatMap((d) => d.tasks).find((t) => t.kind === 'weekly')!;
    const lessonTasks = week.days.flatMap((d) => d.tasks).filter((t) => t.kind === 'grammar' || t.kind === 'vocabulary');
    const practice = (list: typeof GRAMMAR.practice) => list.map((p) => ({ prompt: p.prompt, options: [...p.options], answer: 0, explanation: p.explanation }));
    for (const [i, task] of lessonTasks.slice(0, 2).entries()) {
      const content = i === 0 ? { kind: 'grammar', ...GRAMMAR, practice: practice(GRAMMAR.practice) } : { kind: 'vocabulary', ...VOCABULARY, practice: practice(VOCABULARY.practice) };
      await db.collection('lessons').insertOne({
        userId: user._id,
        taskId: task.id,
        planCreatedAt: plan.createdAt,
        date: task.id.slice(0, 10),
        kind: content.kind,
        status: 'completed',
        content,
        // Missed questions 0 and 1 of each lesson.
        result: { correct: 6, total: 8, seconds: 600, cardsAdded: 2, answers: [1, 1, 0, 0, 0, 0, 0, 0] },
        completedAt: start,
      });
    }
    const reviewDay = new Date(`${week.days.find((d) => d.tasks.includes(weeklyTask))!.date}T06:00:00Z`);
    await expect(openWeekly(db, user, weeklyTask.id, addDays_(start, -1))).rejects.toMatchObject({ code: 'too_early' });
    const opened = await openWeekly(db, user, weeklyTask.id, reviewDay, seeded());
    expect(opened.questions).toHaveLength(10);
    expect(opened.questions.filter((q) => q.missed)).toHaveLength(4);
    expect((await openWeekly(db, user, weeklyTask.id, reviewDay)).id).toBe(opened.id);

    const answers = opened.questions.map((q, i) => (i < 2 ? (q.answer + 1) % 4 : q.answer));
    const done = await completeWeekly(db, user, { taskId: weeklyTask.id, answers, seconds: 300 }, reviewDay);
    expect(done.result).toMatchObject({ correct: 8, total: 10, cardsAdded: 2 });
    expect((await todaySummary(db, user, start)).plan).toBeTruthy();
    const planNow = (await activePlan(db, user._id))!;
    const { doneTaskIds } = await import('@/lib/tasks');
    expect(await doneTaskIds(db, user._id, planNow.createdAt)).toContain(weeklyTask.id);
  });

  it('counts study minutes from reviews, with breaks not counted', async () => {
    const t0 = new Date('2026-11-05T06:00:00Z');
    await db.collection('review_logs').insertMany([
      { userId: user._id, reviewedAt: t0, state: State.New, rating: 3 },
      { userId: user._id, reviewedAt: new Date(t0.getTime() + 30_000), state: State.Review, rating: 3 },
      { userId: user._id, reviewedAt: new Date(t0.getTime() + 60 * 60_000), state: State.Review, rating: 1 },
    ]);
    const m = await minutesByDay(db, user, new Date('2026-11-01T00:00:00Z'));
    // 20 s for the first card, 30 s for the second, and a new session's first card after the hour break.
    expect(Math.round((m.get('2026-11-05') ?? 0) * 60)).toBe(70);
    const p = await progressSummary(db, user, new Date('2026-11-05T12:00:00Z'));
    expect(p.streak).toBe(1);
    expect(p.cards.recall30).toBe(50);
  });

  it('writes the morning reminders from the plan and the cards due', async () => {
    await db.collection('users').updateOne({ _id: user._id }, { $unset: { placement: '' } });
    expect((await upcomingReminders(db, user, 1, start))[0].title).toBe('Find your English level');
    await db.collection('users').updateOne({ _id: user._id }, { $set: { placement: (user as unknown as { placement: unknown }).placement } });
    await createPlan(db, user, { goal: 'work', target: 4, minutes: 30, days: 5 }, start);
    await db.collection('cards').insertMany(
      Array.from({ length: 3 }, (_, i) => ({ userId: user._id, key: `k${i}`, fsrs: { state: State.Review, due: start, stability: 3 } })),
    );
    const list = await upcomingReminders(db, user, 7, start);
    expect(list).toHaveLength(7);
    expect(list[0].date).toBe('2026-11-05');
    expect(list[0].title).toMatch(/^Today: 30 minutes of English$/);
    expect(list[0].body).toMatch(/^3 review cards, then /);
    expect(list.find((r) => r.title === 'Weekly review today')).toBeTruthy();
    expect(list.filter((r) => r.title === 'Rest day')).toHaveLength(2);
    expect(addDays(list[0].date, 6)).toBe(list[6].date);
  });
});
