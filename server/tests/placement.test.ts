import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db, type WithId } from 'mongodb';

import type { UserDoc } from '@/lib/auth';
import { ensureIndexes } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { allItems, getItem } from '@/lib/placement/bank';
import { GRAMMAR } from '@/lib/placement/bank/grammar';
import { LISTENING } from '@/lib/placement/bank/listening';
import { READING } from '@/lib/placement/bank/reading';
import { VOCABULARY } from '@/lib/placement/bank/vocabulary';
import { answer, newStair, pendingItem, type Stair } from '@/lib/placement/engine';
import { gradeWriting } from '@/lib/placement/grading';
import { levelLabel } from '@/lib/placement/levels';
import { answerQuestion, currentStep, latestSummary, resultsOf, startTest, submitSpeaking, submitWriting, type Step, type TestDoc } from '@/lib/placement/service';

/** A repeatable random number generator, so tests do not depend on luck. */
function seeded(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const LEVEL_CODE = ['', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

describe('the question bank', () => {
  it('has the planned number of questions at every level', () => {
    for (let level = 1; level <= 6; level++) {
      expect(GRAMMAR.filter((g) => g.level === level), `grammar ${level}`).toHaveLength(14);
      expect(VOCABULARY.filter((v) => v.level === level), `vocabulary ${level}`).toHaveLength(14);
      expect(READING.filter((r) => r.level === level), `reading ${level}`).toHaveLength(3);
      expect(LISTENING.filter((l) => l.level === level), `listening ${level}`).toHaveLength(8);
    }
    expect(allItems()).toHaveLength(84 + 84 + 54 + 48);
  });

  it('uses ids that match the section and level', () => {
    for (const g of GRAMMAR) expect(g.id).toMatch(new RegExp(`^g-${LEVEL_CODE[g.level]}-\\d{2}$`));
    for (const v of VOCABULARY) expect(v.id).toMatch(new RegExp(`^v-${LEVEL_CODE[v.level]}-\\d{2}$`));
    for (const l of LISTENING) expect(l.id).toMatch(new RegExp(`^l-${LEVEL_CODE[l.level]}-\\d{2}$`));
    for (const r of READING) {
      expect(r.id).toMatch(new RegExp(`^r-${LEVEL_CODE[r.level]}-\\d$`));
      r.questions.forEach((q, i) => expect(q.id).toBe(`${r.id}-q${i + 1}`));
    }
  });

  it('gives every question four different, non-empty options and an explanation', () => {
    for (const item of allItems()) {
      const opts = item.options.map((o) => o.trim().toLowerCase());
      expect(new Set(opts).size, item.id).toBe(4);
      expect(opts.every(Boolean), item.id).toBe(true);
      expect(item.explanation.trim().length, item.id).toBeGreaterThan(10);
      expect(item.prompt.trim().length, item.id).toBeGreaterThan(5);
    }
  });

  it('has exactly one gap in every grammar and vocabulary sentence', () => {
    for (const g of [...GRAMMAR, ...VOCABULARY]) expect(g.prompt.split('___').length - 1, g.id).toBe(1);
  });

  it('does not make the right answer guessable by being the longest option', () => {
    for (const section of ['grammar', 'vocabulary', 'reading', 'listening'] as const) {
      const items = allItems().filter((i) => i.section === section);
      const longest = items.filter((i) => i.options[0].length > Math.max(...i.options.slice(1).map((o) => o.length)));
      expect(longest.length / items.length, section).toBeLessThan(0.5);
    }
  });

  it('keeps reading passages and recordings near the planned length for their level', () => {
    const reading: Record<number, [number, number]> = { 1: [40, 70], 2: [80, 120], 3: [140, 190], 4: [210, 270], 5: [270, 330], 6: [320, 380] };
    for (const r of READING) {
      const [min, max] = reading[r.level];
      const n = wordCount(r.text);
      expect(n, r.id).toBeGreaterThanOrEqual(min * 0.85);
      expect(n, r.id).toBeLessThanOrEqual(max * 1.15);
    }
    const listening: Record<number, [number, number]> = { 1: [10, 25], 2: [25, 50], 3: [50, 80], 4: [70, 110], 5: [90, 130], 6: [100, 140] };
    for (const l of LISTENING) {
      const [min, max] = listening[l.level];
      const n = wordCount(l.lines.map((x) => x.text).join(' '));
      expect(n, l.id).toBeGreaterThanOrEqual(min * 0.85);
      expect(n, l.id).toBeLessThanOrEqual(max * 1.15);
      for (const line of l.lines) expect(line.text, l.id).not.toMatch(/[()[\]<>*#]/);
    }
  });
});

/** Answers like a learner who knows everything up to `ability` and, above it, gets `aboveRight` of each block right. */
function runStair(section: 'grammar' | 'reading', ability: number, aboveRight = 0, rng = seeded()) {
  let stair: Stair = newStair(section, new Set(), new Set(), rng);
  const shown: string[] = [];
  let guard = 0;
  while (!stair.result && guard++ < 50) {
    const { block, index } = pendingItem(stair)!;
    const id = block.itemIds[index];
    shown.push(id);
    const correctPos = block.orders[index].indexOf(0);
    const right = block.level <= ability || index < aboveRight;
    stair = answer(section, stair, id, right ? correctPos : (correctPos + 1) % 4, new Set(), new Set(), rng);
  }
  return { stair, shown };
}

describe('the adaptive staircase', () => {
  it('starts at B1 and climbs to C2 for a learner who gets everything right', () => {
    const { stair } = runStair('grammar', 6);
    expect(stair.blocks.map((b) => b.level)).toEqual([3, 4, 5, 6]);
    expect(stair.result).toEqual({ score: 6, label: 'C2', method: 'staircase' });
  });

  it('drops to Pre-A1 for a learner who gets everything wrong', () => {
    const { stair } = runStair('grammar', 0);
    expect(stair.blocks.map((b) => b.level)).toEqual([3, 2, 1]);
    expect(stair.result?.label).toBe('Pre-A1');
  });

  it('finds the exact level of a B1 learner, and adds a plus for partial success above it', () => {
    expect(runStair('grammar', 3).stair.result).toMatchObject({ score: 3, label: 'B1' });
    expect(runStair('grammar', 3, 2).stair.result).toMatchObject({ score: 3.5, label: 'B1+' });
    expect(runStair('grammar', 2, 1).stair.result).toMatchObject({ label: 'A2' });
    expect(runStair('reading', 4, 1).stair.result).toMatchObject({ label: 'B2' });
  });

  it('never shows the same question twice in one section', () => {
    const { shown } = runStair('grammar', 6);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('avoids two questions on the same grammar point in one block', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { stair } = runStair('grammar', 6, 0, seeded(seed));
      for (const b of stair.blocks) {
        const topics = b.itemIds.map((id) => getItem(id)!.topic!.toLowerCase().split(/[\s:(]+/).slice(0, 2).join(' '));
        expect(new Set(topics).size, b.itemIds.join(',')).toBe(topics.length);
      }
    }
  });

  it('keeps a reading passage together as one block', () => {
    const { stair } = runStair('reading', 3);
    for (const b of stair.blocks) expect(new Set(b.itemIds.map((id) => getItem(id)!.unit)).size).toBe(1);
  });

  it('rejects an answer to a question that is not the current one', () => {
    const rng = seeded();
    const stair = newStair('grammar', new Set(), new Set(), rng);
    expect(() => answer('grammar', stair, 'g-b1-99', 0, new Set(), new Set(), rng)).toThrow(/not the current question/);
  });

  it('prefers questions the learner has not seen in earlier tests', () => {
    const first = runStair('grammar', 6, 0, seeded(1)).shown;
    const rng = seeded(2);
    const stair = newStair('grammar', new Set(), new Set(first), rng);
    expect(stair.blocks[0].itemIds.some((id) => first.includes(id))).toBe(false);
  });

  it('labels decimal scores the way the results page shows them', () => {
    expect(levelLabel(0)).toBe('Pre-A1');
    expect(levelLabel(0.75)).toBe('Pre-A1');
    expect(levelLabel(3.49)).toBe('B1');
    expect(levelLabel(3.5)).toBe('B1+');
    expect(levelLabel(5.99)).toBe('C1+');
    expect(levelLabel(6)).toBe('C2');
  });
});

describe('a full placement test', () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let user: WithId<UserDoc>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongo.getUri());
    db = client.db('english_coach_placement_test');
    await ensureIndexes(db);
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.AZURE_SPEECH_KEY;
    await db.collection('placement_tests').deleteMany({});
    await db.collection('users').deleteMany({});
    const doc = { email: 'learner@example.com', name: null, timezone: 'Asia/Dubai', emailOptIn: true, createdAt: new Date(), lastLoginAt: new Date() } as unknown as UserDoc;
    const { insertedId } = await db.collection<UserDoc>('users').insertOne(doc);
    user = { ...doc, _id: insertedId };
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Answers every multiple-choice question like a learner at `ability`, reading the right answer from the database. */
  async function answerAllMcq(step: Step, ability: number, rng = seeded()): Promise<Step> {
    let guard = 0;
    while (step.kind === 'mcq' && guard++ < 100) {
      const t = (await db.collection<TestDoc>('placement_tests').findOne({ _id: new ObjectId(step.testId) }))!;
      const { block, index } = pendingItem(t.stairs[step.section as 'grammar']!)!;
      const correctPos = block.orders[index].indexOf(0);
      expect(step.item.options[correctPos]).toBe(getItem(step.item.id)!.options[0]);
      const choice = block.level <= ability ? correctPos : (correctPos + 1) % 4;
      step = await answerQuestion(db, user, { testId: step.testId, itemId: step.item.id, choice }, rng);
    }
    return step;
  }

  it('runs from the first question to the results, and never sends the answers to the phone', async () => {
    let step = await startTest(db, user, {}, seeded());
    expect(step).toMatchObject({ kind: 'mcq', section: 'grammar', sectionStart: true, questionNumber: 1 });
    expect(JSON.stringify(step)).not.toMatch(/explanation|"answer"|correct/);

    step = await answerAllMcq(step, 4);
    expect(step).toMatchObject({ kind: 'writing', section: 'writing' });

    step = await submitWriting(db, user, { testId: step.testId, text: 'I work as a nurse in a large hospital in Dubai. '.repeat(12) });
    expect(step).toMatchObject({ kind: 'speaking', taskIndex: 0, taskCount: 2 });

    step = await submitSpeaking(db, user, { testId: step.testId, taskIndex: 0, skip: true, wav: null, seconds: 0 });
    expect(step).toMatchObject({ kind: 'speaking', taskIndex: 1 });
    step = await submitSpeaking(db, user, { testId: step.testId, taskIndex: 1, skip: true, wav: null, seconds: 0 });
    expect(step.kind).toBe('done');

    const results = await resultsOf(db, user, step.testId);
    for (const s of ['grammar', 'vocabulary', 'reading', 'listening'] as const) expect(results.skills[s]).toMatchObject({ label: 'B2', method: 'staircase' });
    expect(results.skills.writing.method).toBe('estimate');
    expect(results.skills.speaking.method).toBe('estimate');
    expect(results.overall.label).toMatch(/^B/);
    expect(results.equivalents.cambridge).toMatch(/B\d/);
    expect(results.notes).toHaveLength(2);
    expect(results.notes[1]).toContain('you skipped the speaking questions');
    expect(results.mistakes.length).toBeGreaterThan(0);
    expect(results.mistakes.every((m) => m.level > 4)).toBe(true);

    expect(await latestSummary(db, user._id)).toMatchObject({ testId: step.testId, overall: results.overall });
    expect(await currentStep(db, user)).toBeNull();
  });

  it('resumes the unfinished test instead of starting another', async () => {
    const first = await startTest(db, user, {}, seeded());
    if (first.kind !== 'mcq') throw new Error('expected a question');
    const second = await answerQuestion(db, user, { testId: first.testId, itemId: first.item.id, choice: 0 }, seeded());
    const resumed = await startTest(db, user);
    expect(resumed).toEqual(second);
    expect(await currentStep(db, user)).toEqual(second);
  });

  it('starts over when asked, and treats answers to the old test as stale', async () => {
    const first = await startTest(db, user, {}, seeded());
    if (first.kind !== 'mcq') throw new Error('expected a question');
    const fresh = await startTest(db, user, { restart: true }, seeded(9));
    expect(fresh.testId).not.toBe(first.testId);
    await expect(answerQuestion(db, user, { testId: first.testId, itemId: first.item.id, choice: 0 })).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a double tap on the same question', async () => {
    const first = await startTest(db, user, {}, seeded());
    if (first.kind !== 'mcq') throw new Error('expected a question');
    await answerQuestion(db, user, { testId: first.testId, itemId: first.item.id, choice: 0 });
    const again = answerQuestion(db, user, { testId: first.testId, itemId: first.item.id, choice: 0 });
    await expect(again).rejects.toBeInstanceOf(HttpError);
    await expect(again).rejects.toMatchObject({ status: 409 });
  });

  it('expires an unfinished test after 7 days', async () => {
    const start = new Date('2026-11-01T08:00:00Z');
    await startTest(db, user, {}, seeded(), start);
    expect(await currentStep(db, user, new Date('2026-11-07T08:00:00Z'))).not.toBeNull();
    expect(await currentStep(db, user, new Date('2026-11-08T08:00:01Z'))).toBeNull();
  });

  it('gives a retake new questions', async () => {
    let step = await startTest(db, user, {}, seeded(3));
    step = await answerAllMcq(step, 3);
    step = await submitWriting(db, user, { testId: step.testId, text: 'Short text.' });
    step = await submitSpeaking(db, user, { testId: step.testId, taskIndex: 0, skip: true, wav: null, seconds: 0 });
    step = await submitSpeaking(db, user, { testId: step.testId, taskIndex: 1, skip: true, wav: null, seconds: 0 });
    const firstTest = (await db.collection<TestDoc>('placement_tests').findOne({ _id: new ObjectId(step.testId) }))!;
    const firstIds = new Set(firstTest.stairs.grammar!.blocks.flatMap((b) => b.itemIds));

    const retake = await startTest(db, user, {}, seeded(4));
    if (retake.kind !== 'mcq') throw new Error('expected a question');
    expect(firstIds.has(retake.item.id)).toBe(false);
  });
});

describe('AI writing grading', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
  });

  it('uses the level from Gemini and drops corrections that do not quote the learner', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const reply = {
      level: 'B1',
      plus: true,
      summary: 'You describe your job clearly.',
      criteria: { content: 4, organisation: 3, range: 3, accuracy: 3 },
      strengths: ['Clear order', 'Good linking words'],
      improvements: ['Check past tenses', 'Use more precise verbs'],
      corrections: [
        { original: 'I have went', corrected: 'I went', note: 'Past simple for finished time.' },
        { original: 'invented phrase', corrected: 'x', note: 'Not in the text.' },
      ],
    };
    const fetchMock = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const text = 'Last year I have went to a new job. It was difficult at first but I learned a lot from my colleagues.';
    const g = await gradeWriting('Describe your job.', text, 3);
    expect(g.result).toEqual({ score: 3.5, label: 'B1+', method: 'ai' });
    expect(g.feedback?.corrections).toEqual([reply.corrections[0]]);

    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.contents[0].parts[0].text).toContain('<learner>');
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
  });

  it('retries a busy model once, then moves along the chain of models', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_RETRY_MS = '0';
    const reply = { level: 'B1', plus: false, summary: 's', criteria: { content: 3, organisation: 3, range: 3, accuracy: 3 }, strengths: [], improvements: [], corrections: [] };
    const busy = () => new Response('{"error":{"code":503}}', { status: 503 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const g = await gradeWriting('Task', 'I like my job very much and I work every day.', 3);
    expect(g.result.label).toBe('B1');
    expect(fetchMock.mock.calls.map((c) => String(c[0]).split('/models/')[1].split(':')[0])).toEqual([
      'gemini-flash-latest',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
    ]);
    delete process.env.GEMINI_RETRY_MS;
  });

  it('falls back to the lighter model when the main one is out of free quota', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const reply = { level: 'A2', plus: false, summary: 's', criteria: { content: 2, organisation: 2, range: 2, accuracy: 2 }, strengths: [], improvements: [], corrections: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const g = await gradeWriting('Task', 'I like my job very much and I work every day.', 2);
    expect(g.result.label).toBe('A2');
    expect(String(fetchMock.mock.calls[1][0])).toContain('gemini-3.5-flash');
  });
});
