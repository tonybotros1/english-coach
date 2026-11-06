/**
 * Placement tests stored in MongoDB. Every answer is saved, so a test can be paused and resumed on any
 * device for 7 days. The phone only ever sees the current step, never the answers.
 */
import { ObjectId, type Db, type WithId } from 'mongodb';

import type { UserDoc } from '../auth';
import { importPlacementCards } from '../cards';
import { assessSpontaneous, isSpeechConfigured, type Assessment } from '../azureSpeech';
import { HttpError } from '../errors';
import { isGeminiConfigured } from '../gemini';
import { getItem, type McqSection } from './bank';
import type { Level } from './bank/types';
import {
  SPEAKING_INTRO,
  SPEAKING_LEVELLED,
  SPEAKING_MAX_SECONDS,
  SPEAKING_TASKS,
  WRITING_MAX_CHARS,
  WRITING_PROMPTS,
  WRITING_TARGET_WORDS,
  speakingBand,
} from './bank/prompts';
import {
  BLOCK,
  MCQ_SECTIONS,
  SECTIONS,
  StaleAnswerError,
  answer as answerStair,
  isMcq,
  mistakesOf,
  newStair,
  pendingItem,
  publicItem,
  shuffle,
  usedIds,
  type Mistake,
  type PublicItem,
  type Rng,
  type Section,
  type SkillResult,
  type Stair,
} from './engine';
import { estimateFrom, estimateWriting, gradeSpeaking, gradeWriting, type SpeakingFeedback, type WritingFeedback } from './grading';
import { EQUIVALENTS, LEVEL_SUMMARIES, levelLabel, type Equivalents } from './levels';

export const TEST_DAYS = 7;
const COLLECTION = 'placement_tests';

type SpeakingTask = { promptId: string; prompt: string; seconds: number | null; assessment: Assessment | null; skipped: boolean };

export type Results = {
  overall: { score: number; label: string };
  skills: Record<Section, SkillResult>;
  weakest: Section[];
  summary: string;
  equivalents: Equivalents;
  mistakes: Mistake[];
  minutes: number;
  /** Plain-English notes about anything estimated rather than measured. */
  notes: string[];
};

export type TestDoc = {
  userId: ObjectId;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  version: number;
  startedAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  /** Index into SECTIONS; equals SECTIONS.length once everything is answered. */
  sectionIndex: number;
  stairs: Partial<Record<McqSection, Stair>>;
  writing: { promptId: string; prompt: string; text: string | null; result: SkillResult | null; feedback: WritingFeedback | null } | null;
  speaking: { tasks: SpeakingTask[]; result: SkillResult | null; feedback: SpeakingFeedback | null } | null;
  aiNotes: string[];
  results: Results | null;
  /** 'checkpoint' tests start each part at the learner's level and ask one speaking question. */
  kind?: 'placement' | 'checkpoint';
  startLevels?: Partial<Record<McqSection, Level>>;
  speakingTasks?: number;
  /** The plan task this checkpoint belongs to, ticked off when it finishes. */
  taskId?: string | null;
};

export type PlacementSummary = { testId: string; completedAt: Date; overall: { score: number; label: string }; skills: Record<Section, SkillResult> };
type UserWithPlacement = UserDoc & { placement?: PlacementSummary; placementSeen?: string[] };

const SECTION_WEIGHT: Record<Section, number> = { grammar: 0.15, vocabulary: 0.12, reading: 0.2, listening: 0.15, writing: 0.2, speaking: 0.18 };

type StepBase = { testId: string; section: Section; sectionIndex: number; sectionCount: number; sectionStart: boolean; progress: number };
export type Step =
  | (StepBase & { kind: 'mcq'; item: PublicItem; questionNumber: number })
  | (StepBase & { kind: 'writing'; prompt: { id: string; text: string }; targetWords: { min: number; max: number }; maxChars: number })
  | (StepBase & { kind: 'speaking'; taskIndex: number; taskCount: number; prompt: { id: string; text: string }; maxSeconds: number })
  | { kind: 'done'; testId: string; progress: 1 };

const tests = (db: Db) => db.collection<TestDoc>(COLLECTION);
const users = (db: Db) => db.collection<UserWithPlacement>('users');

async function seenBy(db: Db, userId: ObjectId): Promise<Set<string>> {
  const u = await users(db).findOne({ _id: userId }, { projection: { placementSeen: 1 } });
  return new Set(u?.placementSeen ?? []);
}

const preferUnseen = <T extends { id: string }>(list: readonly T[], seen: Set<string>, rng: Rng): T => {
  const fresh = list.filter((p) => !seen.has(p.id));
  return shuffle(fresh.length ? fresh : list, rng)[0];
};

const speakingCount = (t: TestDoc) => t.speakingTasks ?? SPEAKING_TASKS;
const mcqScores = (t: TestDoc) => MCQ_SECTIONS.map((s) => t.stairs[s]?.result?.score).filter((n): n is number => typeof n === 'number');

/** Sets up the section the test has just moved into. */
function enterSection(t: TestDoc, seen: Set<string>, rng: Rng) {
  const section = SECTIONS[t.sectionIndex];
  if (!section) return;
  if (isMcq(section)) {
    if (!t.stairs[section]) t.stairs[section] = newStair(section, usedIds(Object.values(t.stairs)), seen, rng, t.startLevels?.[section]);
  } else if (section === 'writing') {
    if (!t.writing) {
      const p = preferUnseen(WRITING_PROMPTS, seen, rng);
      t.writing = { promptId: p.id, prompt: p.text, text: null, result: null, feedback: null };
    }
  } else if (!t.speaking) {
    // A checkpoint has one speaking question, pitched at the level found so far; the placement test starts with an easy one.
    const pool = speakingCount(t) === 1 ? SPEAKING_LEVELLED.filter((x) => x.band === speakingBand(estimateFrom([...mcqScores(t), ...(t.writing?.result ? [t.writing.result.score] : [])]).score)) : SPEAKING_INTRO;
    const p = preferUnseen(pool, seen, rng);
    t.speaking = { tasks: [{ promptId: p.id, prompt: p.text, seconds: null, assessment: null, skipped: false }], result: null, feedback: null };
  }
}

function progressOf(t: TestDoc): number {
  let done = 0;
  SECTIONS.forEach((s, i) => {
    if (i < t.sectionIndex) done += SECTION_WEIGHT[s];
    else if (i === t.sectionIndex) {
      let inner = 0;
      if (isMcq(s)) {
        const answered = (t.stairs[s]?.blocks ?? []).reduce((n, b) => n + b.answers.filter((a) => a !== null).length, 0);
        inner = Math.min(0.9, answered / (BLOCK[s].size * 2.5));
      } else if (s === 'speaking') inner = (t.speaking?.tasks.filter((k) => k.seconds !== null).length ?? 0) / speakingCount(t);
      done += SECTION_WEIGHT[s] * inner;
    }
  });
  return Math.round(Math.min(0.99, done) * 100) / 100;
}

export function stepOf(t: WithId<TestDoc>): Step {
  const testId = t._id.toHexString();
  const section = SECTIONS[t.sectionIndex];
  if (!section || t.status === 'completed') return { kind: 'done', testId, progress: 1 };
  const base = { testId, section, sectionIndex: t.sectionIndex, sectionCount: SECTIONS.length, progress: progressOf(t) };
  if (isMcq(section)) {
    const stair = t.stairs[section]!;
    const pending = pendingItem(stair)!;
    const item = getItem(pending.block.itemIds[pending.index])!;
    const answered = stair.blocks.reduce((n, b) => n + b.answers.filter((a) => a !== null).length, 0);
    return { ...base, kind: 'mcq', sectionStart: answered === 0, item: publicItem(item, pending.block.orders[pending.index]), questionNumber: answered + 1 };
  }
  if (section === 'writing') {
    const w = t.writing!;
    return { ...base, kind: 'writing', sectionStart: true, prompt: { id: w.promptId, text: w.prompt }, targetWords: WRITING_TARGET_WORDS, maxChars: WRITING_MAX_CHARS };
  }
  const tasks = t.speaking!.tasks;
  const taskIndex = tasks.findIndex((k) => k.seconds === null);
  const task = tasks[taskIndex];
  return {
    ...base,
    kind: 'speaking',
    sectionStart: taskIndex === 0,
    taskIndex,
    taskCount: speakingCount(t),
    prompt: { id: task.promptId, text: task.prompt },
    maxSeconds: SPEAKING_MAX_SECONDS,
  };
}

/** Saves the changed test, failing if another request changed it first (for example a double tap). */
async function save(db: Db, t: WithId<TestDoc>, now: Date) {
  const { _id, version, ...rest } = t;
  const r = await tests(db).updateOne({ _id, version }, { $set: { ...rest, version: version + 1, updatedAt: now } });
  if (r.matchedCount === 0) throw new HttpError(409, 'This test was updated somewhere else. Reloading the current question.', 'stale');
  t.version = version + 1;
}

/** The learner's unfinished test, marking it expired if it is older than TEST_DAYS. */
export async function activeTest(db: Db, userId: ObjectId, now = new Date()): Promise<WithId<TestDoc> | null> {
  const t = await tests(db).findOne({ userId, status: 'in_progress' }, { sort: { startedAt: -1 } });
  if (t && t.expiresAt <= now) {
    await tests(db).updateOne({ _id: t._id }, { $set: { status: 'expired', updatedAt: now } });
    return null;
  }
  return t;
}

async function ownTest(db: Db, userId: ObjectId, testId: unknown, now: Date): Promise<WithId<TestDoc>> {
  const t = await activeTest(db, userId, now);
  if (!t || typeof testId !== 'string' || t._id.toHexString() !== testId) {
    throw new HttpError(409, 'This test has ended or was replaced. Reloading.', 'stale');
  }
  return t;
}

/**
 * Resumes the unfinished test, or starts a new one. `restart` abandons the unfinished one first.
 * `checkpointTaskId` starts a short checkpoint test from the learner's current levels instead.
 */
export async function startTest(
  db: Db,
  user: WithId<UserDoc>,
  opts: { restart?: boolean; checkpointTaskId?: string } = {},
  rng: Rng = Math.random,
  now = new Date(),
): Promise<Step> {
  const existing = await activeTest(db, user._id, now);
  if (existing && !opts.restart) return stepOf(existing);
  if (existing) await tests(db).updateOne({ _id: existing._id }, { $set: { status: 'abandoned', updatedAt: now } });
  const seen = await seenBy(db, user._id);
  let checkpoint: Pick<TestDoc, 'kind' | 'startLevels' | 'speakingTasks' | 'taskId'> = { kind: 'placement' };
  if (opts.checkpointTaskId) {
    const latest = await latestSummary(db, user._id);
    if (!latest) throw new HttpError(409, 'Take the placement test first.', 'no_placement');
    const startLevels = Object.fromEntries(MCQ_SECTIONS.map((s) => [s, Math.max(1, Math.min(6, Math.floor(latest.skills[s].score + 1e-9))) as Level]));
    checkpoint = { kind: 'checkpoint', startLevels, speakingTasks: 1, taskId: opts.checkpointTaskId };
  }
  const doc: TestDoc = {
    userId: user._id,
    status: 'in_progress',
    version: 0,
    startedAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + TEST_DAYS * 86_400_000),
    completedAt: null,
    sectionIndex: 0,
    stairs: {},
    writing: null,
    speaking: null,
    aiNotes: [],
    results: null,
    ...checkpoint,
  };
  enterSection(doc, seen, rng);
  const { insertedId } = await tests(db).insertOne(doc);
  return stepOf({ ...doc, _id: insertedId });
}

export async function currentStep(db: Db, user: WithId<UserDoc>, now = new Date()): Promise<Step | null> {
  const t = await activeTest(db, user._id, now);
  return t ? stepOf(t) : null;
}

export async function abandonTest(db: Db, user: WithId<UserDoc>, testId: unknown, now = new Date()) {
  const t = await ownTest(db, user._id, testId, now);
  await tests(db).updateOne({ _id: t._id }, { $set: { status: 'abandoned', updatedAt: now } });
}

function expectSection(t: TestDoc, wanted: Section | 'mcq') {
  const s = SECTIONS[t.sectionIndex];
  const ok = wanted === 'mcq' ? s !== undefined && isMcq(s) : s === wanted;
  if (!ok) throw new HttpError(409, 'The test has moved on to another part. Reloading.', 'stale');
}

export async function answerQuestion(db: Db, user: WithId<UserDoc>, input: { testId: unknown; itemId: unknown; choice: unknown }, rng: Rng = Math.random, now = new Date()): Promise<Step> {
  const t = await ownTest(db, user._id, input.testId, now);
  expectSection(t, 'mcq');
  const section = SECTIONS[t.sectionIndex] as McqSection;
  const seen = await seenBy(db, user._id);
  let next: Stair;
  try {
    const others = usedIds(MCQ_SECTIONS.filter((s) => s !== section).map((s) => t.stairs[s]));
    next = answerStair(section, t.stairs[section]!, String(input.itemId), Number(input.choice), others, seen, rng);
  } catch (e) {
    if (e instanceof StaleAnswerError) throw new HttpError(409, 'That question was already answered. Reloading.', 'stale');
    if (e instanceof RangeError) throw new HttpError(400, e.message, 'invalid_choice');
    throw e;
  }
  t.stairs[section] = next;
  if (next.result) {
    t.sectionIndex += 1;
    enterSection(t, seen, rng);
  }
  await save(db, t, now);
  return stepOf(t);
}

export async function submitWriting(db: Db, user: WithId<UserDoc>, input: { testId: unknown; text: unknown }, rng: Rng = Math.random, now = new Date()): Promise<Step> {
  const t = await ownTest(db, user._id, input.testId, now);
  expectSection(t, 'writing');
  const text = typeof input.text === 'string' ? input.text.trim().slice(0, WRITING_MAX_CHARS) : '';
  const language = estimateFrom(mcqScores(t)).score;
  let graded: Awaited<ReturnType<typeof gradeWriting>>;
  try {
    graded = await gradeWriting(t.writing!.prompt, text, language);
  } catch (e) {
    // Never trap the learner in the test because the free AI tier is busy: estimate and say so.
    console.error('Writing grading failed', e);
    graded = { result: estimateWriting(text, language), feedback: null };
    t.aiNotes.push('AI writing grading was not available, so your writing level is an estimate.');
  }
  t.writing = { ...t.writing!, text, result: graded.result, feedback: graded.feedback };
  t.sectionIndex += 1;
  enterSection(t, await seenBy(db, user._id), rng);
  await save(db, t, now);
  return stepOf(t);
}

export type SpeakingUpload = { testId: unknown; taskIndex: unknown; skip: boolean; wav: Buffer | null; seconds: number };

export async function submitSpeaking(db: Db, user: WithId<UserDoc>, input: SpeakingUpload, rng: Rng = Math.random, now = new Date()): Promise<Step> {
  const t = await ownTest(db, user._id, input.testId, now);
  expectSection(t, 'speaking');
  const sp = t.speaking!;
  const index = sp.tasks.findIndex((k) => k.seconds === null);
  if (Number(input.taskIndex) !== index) throw new HttpError(409, 'That answer was already saved. Reloading.', 'stale');

  let assessment: Assessment | null = null;
  if (!input.skip && input.wav && isSpeechConfigured()) {
    try {
      assessment = await assessSpontaneous(input.wav);
    } catch (e) {
      console.error('Speech scoring failed', e);
      if (e instanceof HttpError && e.code === 'speech_auth') throw e;
      t.aiNotes.push('The speech service was not available for one answer, so it was not scored.');
    }
    if (assessment && (assessment.status !== 'Success' || !assessment.recognized.trim())) {
      throw new HttpError(422, "We couldn't hear any speech in that recording. Hold the phone closer and try again.", 'no_speech');
    }
  }
  sp.tasks[index] = { ...sp.tasks[index], seconds: input.skip ? 0 : input.seconds, assessment, skipped: input.skip };

  if (index + 1 < speakingCount(t)) {
    const seen = await seenBy(db, user._id);
    const estimate = estimateFrom([...mcqScores(t), ...(t.writing?.result ? [t.writing.result.score] : [])]).score;
    const p = preferUnseen(SPEAKING_LEVELLED.filter((x) => x.band === speakingBand(estimate)), seen, rng);
    sp.tasks.push({ promptId: p.id, prompt: p.text, seconds: null, assessment: null, skipped: false });
  } else {
    const others = [...mcqScores(t), ...(t.writing?.result ? [t.writing.result.score] : [])];
    try {
      const g = await gradeSpeaking(
        sp.tasks.map((k) => ({ prompt: k.prompt, seconds: k.seconds ?? 0, assessment: k.assessment })),
        others,
      );
      sp.result = g.result;
      sp.feedback = g.feedback;
    } catch (e) {
      console.error('Speaking grading failed', e);
      sp.result = estimateFrom(others);
      t.aiNotes.push('AI speaking grading was not available, so your speaking level is an estimate.');
    }
    t.sectionIndex += 1;
    finish(t, now);
  }
  await save(db, t, now);
  if (t.status === 'completed') await recordCompletion(db, user._id, t);
  return stepOf(t);
}

function finish(t: TestDoc, now: Date) {
  const skills = {} as Record<Section, SkillResult>;
  for (const s of MCQ_SECTIONS) skills[s] = t.stairs[s]!.result!;
  skills.writing = t.writing!.result!;
  skills.speaking = t.speaking!.result!;
  const score = Math.round((SECTIONS.reduce((a, s) => a + skills[s].score, 0) / SECTIONS.length) * 100) / 100;
  const base = Math.floor(score + 1e-9);
  const notes = [...new Set(t.aiNotes)];
  if (skills.writing.method === 'estimate' && !notes.some((n) => n.includes('writing')))
    notes.push('Your writing level is an estimate from your grammar and vocabulary results, because AI grading is not set up on the server yet.');
  if (skills.speaking.method === 'estimate' && !notes.some((n) => n.includes('speaking'))) {
    const tasks = t.speaking!.tasks;
    const reason = tasks.every((k) => k.skipped)
      ? 'you skipped the speaking questions'
      : !isSpeechConfigured()
        ? 'speech scoring is not set up on the server yet'
        : !isGeminiConfigured()
          ? 'AI grading is not set up on the server yet'
          : 'no speech could be scored';
    notes.push(`Your speaking level is an estimate from your other skills, because ${reason}.`);
  }
  t.results = {
    overall: { score, label: levelLabel(score) },
    skills,
    weakest: [...SECTIONS].sort((a, b) => skills[a].score - skills[b].score).slice(0, 2),
    summary: LEVEL_SUMMARIES[base],
    equivalents: EQUIVALENTS[base],
    mistakes: MCQ_SECTIONS.flatMap((s) => mistakesOf(s, t.stairs[s]!)),
    minutes: Math.max(1, Math.round((now.getTime() - t.startedAt.getTime()) / 60_000)),
    notes,
  };
  t.status = 'completed';
  t.completedAt = now;
}

async function recordCompletion(db: Db, userId: ObjectId, t: WithId<TestDoc>) {
  const seen = [
    ...usedIds(Object.values(t.stairs)),
    ...(t.writing ? [t.writing.promptId] : []),
    ...(t.speaking?.tasks.map((k) => k.promptId) ?? []),
  ];
  const summary: PlacementSummary = { testId: t._id.toHexString(), completedAt: t.completedAt!, overall: t.results!.overall, skills: t.results!.skills };
  await users(db).updateOne({ _id: userId }, { $set: { placement: summary }, $addToSet: { placementSeen: { $each: seen } } });
  // Every mistake becomes a review card.
  await importPlacementCards(db, userId, t._id, t.completedAt ?? new Date());
  // A checkpoint ticks off its plan task and rebuilds the rest of the plan from the new levels.
  if (t.kind === 'checkpoint') {
    const { applyCheckpoint } = await import('../plan/service');
    await applyCheckpoint(db, userId, summary, t.taskId ?? null, t.completedAt ?? new Date());
  }
}

export async function latestSummary(db: Db, userId: ObjectId): Promise<PlacementSummary | null> {
  const u = await users(db).findOne({ _id: userId }, { projection: { placement: 1 } });
  const p = u?.placement;
  if (!p) return null;
  // Labels are recomputed from scores, so results saved under older labelling rules display correctly.
  const relabel = (r: SkillResult) => ({ ...r, label: levelLabel(r.score) });
  return {
    ...p,
    overall: { score: p.overall.score, label: levelLabel(p.overall.score) },
    skills: Object.fromEntries(Object.entries(p.skills).map(([k, v]) => [k, relabel(v)])) as Record<Section, SkillResult>,
  };
}

/** The full results page for one of the learner's completed tests. */
export async function resultsOf(db: Db, user: WithId<UserDoc>, testId: string) {
  if (!ObjectId.isValid(testId)) throw new HttpError(404, 'Those results were not found.', 'not_found');
  const t = await tests(db).findOne({ _id: new ObjectId(testId), userId: user._id, status: 'completed' });
  if (!t?.results) throw new HttpError(404, 'Those results were not found.', 'not_found');
  return {
    testId,
    kind: t.kind ?? 'placement',
    completedAt: t.completedAt,
    ...t.results,
    overall: { score: t.results.overall.score, label: levelLabel(t.results.overall.score) },
    skills: Object.fromEntries(Object.entries(t.results.skills).map(([k, v]) => [k, { ...v, label: levelLabel(v.score) }])) as Record<Section, SkillResult>,
    writing: { prompt: t.writing!.prompt, text: t.writing!.text, feedback: t.writing!.feedback },
    speaking: {
      feedback: t.speaking!.feedback,
      answers: t.speaking!.tasks.map((k) => ({
        prompt: k.prompt,
        seconds: k.seconds,
        skipped: k.skipped,
        transcript: k.assessment?.recognized ?? null,
        scores: k.assessment?.scores ?? null,
      })),
    },
  };
}
