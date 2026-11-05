import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db, type WithId } from 'mongodb';

import type { UserDoc } from '@/lib/auth';
import { ensureIndexes } from '@/lib/db';
import { checkLesson } from '@/lib/lessons/content';
import { generateLesson } from '@/lib/lessons/generate';
import { scoreDictation } from '@/lib/lessons/grade';
import { completeLesson, openLesson, scoreShadowing, submitLessonWriting, submitTalk } from '@/lib/lessons/service';
import type { Levels } from '@/lib/plan/engine';
import { createPlan, todaySummary } from '@/lib/plan/service';
import { GRAMMAR, LISTENING, READING, SPEAKING, SPEAKING_FEEDBACK, VOCABULARY, WRITING, WRITING_FEEDBACK } from './fixtures/lessons';

function seeded(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const gemini = (body: unknown) => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] });
const azure = (display: string, score = 82) =>
  Response.json({ RecognitionStatus: 'Success', DisplayText: display, NBest: [{ PronScore: score, AccuracyScore: score, FluencyScore: 85, CompletenessScore: 100, ProsodyScore: 80, Words: [{ Word: 'work', AccuracyScore: 40, ErrorType: 'Mispronunciation' }] }] });

describe('lesson checks', () => {
  it('accepts well-formed lessons of every kind', () => {
    expect(checkLesson('grammar', GRAMMAR, 3)).toEqual([]);
    expect(checkLesson('vocabulary', VOCABULARY, 3)).toEqual([]);
    expect(checkLesson('reading', READING, 3)).toEqual([]);
    expect(checkLesson('listening', LISTENING, 3)).toEqual([]);
    expect(checkLesson('writing', WRITING, 3)).toEqual([]);
    expect(checkLesson('speaking', SPEAKING, 3)).toEqual([]);
  });

  it('catches the mistakes that would break a lesson', () => {
    const badGrammar = { ...GRAMMAR, practice: [{ ...GRAMMAR.practice[0], prompt: 'No gap here.' }, ...GRAMMAR.practice.slice(1)] };
    expect(checkLesson('grammar', badGrammar, 3).join()).toMatch(/exactly one gap/);
    const dup = { ...GRAMMAR, practice: [{ ...GRAMMAR.practice[0], options: ['a', 'a', 'b', 'c'] }, ...GRAMMAR.practice.slice(1)] };
    expect(checkLesson('grammar', dup, 3).join()).toMatch(/different/);
    const badDictation = { ...LISTENING, dictation: ['This sentence was never said.', ...LISTENING.dictation.slice(1)] };
    expect(checkLesson('listening', badDictation, 3).join()).toMatch(/word for word/);
    expect(checkLesson('reading', { ...READING, text: 'Too short.' }, 3).join()).toMatch(/words/);
    const badVocab = { ...VOCABULARY, practice: [{ ...VOCABULARY.practice[0], options: ['banana', 'agenda', 'deadline', 'minutes'] }, ...VOCABULARY.practice.slice(1)] };
    expect(checkLesson('vocabulary', badVocab, 3).join()).toMatch(/one of the lesson's words/);
  });
});

describe('dictation scoring', () => {
  it('marks each word heard or missed, ignoring capitals and punctuation', () => {
    const r = scoreDictation("I'll send them an email this afternoon.", 'i send them a email this afternoon');
    expect(r.words.map((w) => w.ok)).toEqual([false, true, true, false, true, true, true]);
    expect(r.accuracy).toBeGreaterThan(50);
    expect(r.accuracy).toBeLessThan(100);
    expect(scoreDictation('The deadline is Monday.', 'the deadline is monday').accuracy).toBe(100);
    expect(scoreDictation('The deadline is Monday.', '').accuracy).toBe(0);
    // Contractions written out in full are not mistakes, and the other way round.
    expect(scoreDictation("I'll send it, but I can't come.", 'I will send it but I cannot come').accuracy).toBe(100);
    expect(scoreDictation('We are not ready.', "we're not ready").accuracy).toBe(100);
  });
});

describe('writing lessons with Gemini', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
  });

  it('shuffles options but keeps track of the right answer', async () => {
    process.env.GEMINI_API_KEY = 'test';
    vi.stubGlobal('fetch', vi.fn(async () => gemini(GRAMMAR)));
    const lesson = await generateLesson({ kind: 'grammar', level: 3, topic: 'Present perfect or past simple', goal: 'work', minutes: 15 }, seeded());
    if (lesson.kind !== 'grammar') throw new Error('wrong kind');
    lesson.practice.forEach((p, i) => expect(p.options[p.answer]).toBe(GRAMMAR.practice[i].options[0]));
    expect(lesson.practice.some((p) => p.answer !== 0)).toBe(true);
  });

  it('retries once, telling Gemini what was wrong', async () => {
    process.env.GEMINI_API_KEY = 'test';
    const bad = { ...LISTENING, dictation: ['Never said.', ...LISTENING.dictation.slice(1)] };
    const fetchMock = vi.fn().mockResolvedValueOnce(gemini(bad)).mockResolvedValueOnce(gemini(LISTENING));
    vi.stubGlobal('fetch', fetchMock);
    const lesson = await generateLesson({ kind: 'listening', level: 3, topic: 'Work and meetings', goal: 'work', minutes: 10 }, seeded());
    expect(lesson.kind).toBe('listening');
    const second = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(second.contents[0].parts[0].text).toMatch(/word for word/);
  });

  it('gives up with a friendly error when both attempts fail the checks', async () => {
    process.env.GEMINI_API_KEY = 'test';
    vi.stubGlobal('fetch', vi.fn(async () => gemini({ ...READING, text: 'Too short.' })));
    await expect(generateLesson({ kind: 'reading', level: 3, topic: 'x', goal: 'work', minutes: 15 })).rejects.toMatchObject({ status: 502, code: 'lesson_failed' });
  });
});

describe('lessons in the plan', () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let user: WithId<UserDoc>;
  const now = new Date('2026-11-05T08:00:00Z');
  const levels: Levels = { grammar: 3, vocabulary: 3, reading: 3, listening: 3, writing: 3, speaking: 3 };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongo.getUri());
    db = client.db('english_coach_lessons_test');
    await ensureIndexes(db);
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    for (const c of ['users', 'plans', 'lessons', 'cards', 'placement_tests']) await db.collection(c).deleteMany({});
    process.env.GEMINI_API_KEY = 'test';
    process.env.AZURE_SPEECH_KEY = 'test';
    process.env.AZURE_SPEECH_REGION = 'uaenorth';
    const doc = {
      email: 'learner@example.com',
      name: null,
      timezone: 'Asia/Dubai',
      emailOptIn: true,
      createdAt: now,
      lastLoginAt: now,
      placement: {
        testId: new ObjectId().toHexString(),
        completedAt: now,
        overall: { score: 3, label: 'B1' },
        skills: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, { score: v, label: 'B1', method: 'staircase' }])),
      },
    } as unknown as UserDoc;
    const { insertedId } = await db.collection<UserDoc>('users').insertOne(doc);
    user = { ...doc, _id: insertedId };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
  });

  /** Builds a 7-day plan and returns the first task of `kind` from the first two weeks. */
  async function taskOf(kind: string) {
    const p = await createPlan(db, user, { goal: 'work', target: 4, minutes: 45, days: 7 }, now);
    for (const w of p.plan.weeks.slice(0, 2)) for (const d of w.days) for (const t of d.tasks) if (t.kind === kind) return t;
    throw new Error(`no ${kind} task`);
  }
  it('writes a lesson once, then serves the saved copy', async () => {
    const task = await taskOf('grammar');
    const fetchMock = vi.fn(async () => gemini(GRAMMAR));
    vi.stubGlobal('fetch', fetchMock);
    const opened = await openLesson(db, user, task.id, new Date(`${task.id.slice(0, 10)}T08:00:00Z`), seeded());
    expect(opened.status).toBe('ready');
    const again = await openLesson(db, user, task.id, now);
    expect(again.lesson?.id).toBe(opened.lesson?.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tells a second request to wait while the first is still writing', async () => {
    const task = await taskOf('grammar');
    let release: (r: Response) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (release = r))));
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const first = openLesson(db, user, task.id, at, seeded());
    await new Promise((r) => setTimeout(r, 50));
    expect((await openLesson(db, user, task.id, at)).status).toBe('generating');
    release(gemini(GRAMMAR));
    expect((await first).status).toBe('ready');
  });

  it('refuses lessons from far ahead in the plan, and non-lesson tasks', async () => {
    const p = await createPlan(db, user, { goal: 'work', target: 4, minutes: 45, days: 7 }, now);
    const later = p.plan.weeks[2].days[0].tasks.find((t) => t.kind !== 'review')!;
    await expect(openLesson(db, user, later.id, now)).rejects.toMatchObject({ code: 'too_early' });
    await expect(openLesson(db, user, p.plan.weeks[0].days[0].tasks[0].id, now)).rejects.toMatchObject({ code: 'not_a_lesson' });
  });

  it('finishes a grammar lesson, turns mistakes into cards and ticks the task off on Today', async () => {
    const task = await taskOf('grammar');
    vi.stubGlobal('fetch', vi.fn(async () => gemini(GRAMMAR)));
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const { lesson } = await openLesson(db, user, task.id, at, seeded());
    if (lesson?.content?.kind !== 'grammar') throw new Error('wrong kind');
    const answers = lesson.content.practice.map((p, i) => (i < 6 ? p.answer : (p.answer + 1) % 4));
    const done = await completeLesson(db, user, { lessonId: lesson.id, answers, seconds: 600 }, at);
    expect(done.result).toMatchObject({ correct: 6, total: 8, cardsAdded: 2, seconds: 600 });
    expect(await db.collection('cards').countDocuments({ 'source.type': 'lesson' })).toBe(2);
    // Finishing again changes nothing.
    expect((await completeLesson(db, user, { lessonId: lesson.id, answers, seconds: 1 }, at)).result?.seconds).toBe(600);
    const t = await todaySummary(db, user, at);
    expect(t.plan?.done).toContain(task.id);
  });

  it('adds every new word as a card, once, across lessons', async () => {
    const task = await taskOf('vocabulary');
    vi.stubGlobal('fetch', vi.fn(async () => gemini(VOCABULARY)));
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const { lesson } = await openLesson(db, user, task.id, at, seeded());
    if (lesson?.content?.kind !== 'vocabulary') throw new Error('wrong kind');
    await completeLesson(db, user, { lessonId: lesson.id, answers: lesson.content.practice.map((p) => p.answer), seconds: 300 }, at);
    const words = await db.collection('cards').find({ key: /^word:/ }).toArray();
    expect(words).toHaveLength(6);
    const agenda = words.find((w) => w.key === 'word:agenda')!;
    expect(agenda.front.prompt).toContain('___');
    expect(agenda.front.prompt.toLowerCase()).not.toContain('agenda');
    expect(agenda.back.answer).toBe('agenda');
  });

  it('scores listening questions and dictation, and makes cards for missed words', async () => {
    const task = await taskOf('listening');
    vi.stubGlobal('fetch', vi.fn(async () => gemini(LISTENING)));
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const { lesson } = await openLesson(db, user, task.id, at, seeded());
    if (lesson?.content?.kind !== 'listening') throw new Error('wrong kind');
    const typed = [LISTENING.dictation[0], 'shall we book the meeting room on the floor', LISTENING.dictation[2].toLowerCase()];
    const done = await completeLesson(db, user, { lessonId: lesson.id, answers: lesson.content.questions.map((q) => q.answer), dictation: typed, seconds: 400 }, at);
    expect(done.result?.correct).toBe(3);
    expect(done.result?.dictation?.map((d) => d.accuracy)).toEqual([100, expect.any(Number), 100]);
    expect(done.result!.dictation![1].words.filter((w) => !w.ok).map((w) => w.word)).toEqual(['big', 'third']);
    expect(done.result?.cardsAdded).toBe(1);
  });

  it('grades writing, keeps only corrections that quote the learner, and saves them as cards', async () => {
    const task = await taskOf('writing');
    const fetchMock = vi.fn().mockResolvedValueOnce(gemini(WRITING)).mockResolvedValueOnce(gemini(WRITING_FEEDBACK));
    vi.stubGlobal('fetch', fetchMock);
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const { lesson } = await openLesson(db, user, task.id, at, seeded());
    const done = await submitLessonWriting(db, user, { lessonId: lesson!.id, text: 'Dear Ahmed, yesterday I have went to the dentist so I could not finish the slides.', seconds: 700 }, at);
    expect(done.result?.writing?.feedback.corrections).toHaveLength(1);
    expect(done.result?.writing?.feedback.label).toBe('B1');
    expect(done.result?.cardsAdded).toBe(1);
  });

  it('scores shadowing and free talk with Azure and Gemini', async () => {
    const task = await taskOf('speaking');
    const at = new Date(`${task.id.slice(0, 10)}T08:00:00Z`);
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes('generativelanguage')) return fetchMock.mock.calls.length <= 1 ? gemini(SPEAKING) : gemini(SPEAKING_FEEDBACK);
      return azure('I work in a small team in the city centre.', 60);
    });
    vi.stubGlobal('fetch', fetchMock);
    const { lesson } = await openLesson(db, user, task.id, at, seeded());
    const shadow = await scoreShadowing(db, user, { lessonId: lesson!.id, index: 0, wav: Buffer.from('wav') });
    expect(shadow.scores.pronunciation).toBe(60);
    const done = await submitTalk(db, user, { lessonId: lesson!.id, wav: Buffer.from('wav'), seconds: 25, lessonSeconds: 500 }, at);
    expect(done.result?.speaking?.feedback?.summary).toBe('You describe your day clearly.');
    expect(done.result?.speaking?.label).toBe('B1+');
    // The weak shadowing sentence (score 60) becomes a card to practise.
    expect(done.result?.cardsAdded).toBe(1);
  });

  it('explains which setting is missing when AI is not set up', async () => {
    delete process.env.GEMINI_API_KEY;
    const task = await taskOf('grammar');
    await expect(openLesson(db, user, task.id, new Date(`${task.id.slice(0, 10)}T08:00:00Z`))).rejects.toMatchObject({ setting: 'GEMINI_API_KEY' });
  });
});
