/**
 * Review cards with FSRS (Free Spaced Repetition Scheduler), the open-source algorithm Anki uses.
 * The learner recalls the answer, reveals it, and rates how well they knew it; FSRS then schedules the
 * next review for when they are about to forget, targeting 90% recall.
 */
import { ObjectId, type Db, type WithId } from 'mongodb';
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';

import type { UserDoc } from './auth';
import { localDate, shortInterval } from './dates';
import { HttpError } from './errors';
import { getItem } from './placement/bank';

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true, maximum_interval: 365 }));
export const MAX_SESSION = 60;

export type CardFront = {
  prompt: string;
  /** For reading cards: the passage the question was about. */
  passage: { title: string; text: string } | null;
  /** For listening cards: the recording, replayed with text-to-speech. */
  lines: { speaker: 'A' | 'B'; text: string }[] | null;
  instruction: string | null;
};
export type CardBack = { answer: string; explanation: string; yourAnswer: string | null; transcript: string | null };
export type CardDoc = {
  userId: ObjectId;
  /** Unique per learner, so the same mistake never makes two cards. */
  key: string;
  skill: string;
  source: { type: 'placement' | 'writing'; testId: string } | { type: 'lesson'; lessonId: string };
  front: CardFront;
  back: CardBack;
  fsrs: FsrsCard;
  /** The learner's local date when the card was first reviewed. */
  introducedOn: string | null;
  createdAt: Date;
};
type ReviewLogDoc = { userId: ObjectId; cardId: ObjectId; rating: Grade; state: State; reviewedAt: Date; scheduledDays: number; date: string };

const cards = (db: Db) => db.collection<CardDoc>('cards');
const logs = (db: Db) => db.collection<ReviewLogDoc>('review_logs');

type PlacementTest = {
  _id: ObjectId;
  userId: ObjectId;
  stairs?: Record<string, { blocks: { itemIds: string[] }[] }>;
  results: {
    mistakes: {
      section: string;
      itemId: string;
      prompt: string;
      chosen: string;
      correct: string;
      explanation: string;
      passageTitle: string | null;
      transcript: string | null;
    }[];
  } | null;
  writing: { feedback: { corrections: { original: string; corrected: string; note: string }[] } | null } | null;
};

/**
 * Turns a finished placement test's mistakes into review cards. Safe to run more than once: cards that
 * already exist are left as they are, with their review history.
 */
export async function importPlacementCards(db: Db, userId: ObjectId, testId: ObjectId, now = new Date()): Promise<number> {
  const test = await db.collection<PlacementTest>('placement_tests').findOne({ _id: testId, userId });
  if (!test?.results) return 0;
  const docs: CardDoc[] = [];
  for (const m of test.results.mistakes) {
    const item = getItem(m.itemId);
    docs.push({
      userId,
      key: `placement:${m.itemId}`,
      skill: m.section,
      source: { type: 'placement', testId: testId.toHexString() },
      front: {
        prompt: m.prompt,
        passage: m.section === 'reading' && item?.passage ? item.passage : null,
        lines: m.section === 'listening' && item?.lines ? [...item.lines] : null,
        instruction: m.prompt.includes('___') ? 'Say the missing word or phrase.' : m.section === 'listening' ? 'Listen, then answer.' : 'Answer the question.',
      },
      back: { answer: m.correct, explanation: m.explanation, yourAnswer: m.chosen, transcript: m.transcript },
      fsrs: createEmptyCard(now),
      introducedOn: null,
      createdAt: now,
    });
  }
  (test.writing?.feedback?.corrections ?? []).forEach((c, i) => {
    docs.push({
      userId,
      key: `writing:${testId.toHexString()}:${i}`,
      skill: 'writing',
      source: { type: 'writing', testId: testId.toHexString() },
      front: { prompt: c.original, passage: null, lines: null, instruction: 'Correct this phrase from your writing.' },
      back: { answer: c.corrected, explanation: c.note, yourAnswer: null, transcript: null },
      fsrs: createEmptyCard(now),
      introducedOn: null,
      createdAt: now,
    });
  });
  if (!docs.length) return 0;
  const r = await cards(db).bulkWrite(
    docs.map((d) => ({ updateOne: { filter: { userId, key: d.key }, update: { $setOnInsert: d }, upsert: true } })),
    { ordered: false },
  );
  return r.upsertedCount;
}

export type NewCard = { key: string; skill: string; lessonId: string; front: CardFront; back: CardBack };

/** Adds review cards from a lesson. Cards whose key already exists (the same word or mistake) are kept as they are. */
export async function addLessonCards(db: Db, userId: ObjectId, list: NewCard[], now = new Date()): Promise<number> {
  if (!list.length) return 0;
  const r = await cards(db).bulkWrite(
    list.map((c) => ({
      updateOne: {
        filter: { userId, key: c.key },
        update: {
          $setOnInsert: {
            userId,
            key: c.key,
            skill: c.skill,
            source: { type: 'lesson' as const, lessonId: c.lessonId },
            front: c.front,
            back: c.back,
            fsrs: createEmptyCard(now),
            introducedOn: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return r.upsertedCount;
}

/** What each rating button would do, for example "Again <10m", "Good 3d". */
function previews(card: FsrsCard, now: Date): Record<'again' | 'hard' | 'good' | 'easy', string> {
  const log = scheduler.repeat(card, now);
  const when = (g: Grade) => shortInterval(log[g].card.due.getTime() - now.getTime());
  return { again: when(Rating.Again), hard: when(Rating.Hard), good: when(Rating.Good), easy: when(Rating.Easy) };
}

export function publicCard(c: WithId<CardDoc>, now: Date) {
  return {
    id: c._id.toHexString(),
    skill: c.skill,
    front: c.front,
    back: c.back,
    isNew: c.fsrs.state === State.New,
    reps: c.fsrs.reps,
    intervals: previews(c.fsrs, now),
  };
}
export type PublicCard = ReturnType<typeof publicCard>;

export async function cardCounts(db: Db, user: WithId<UserDoc>, newPerDay: number, now = new Date()) {
  const today = localDate(user.timezone, now);
  const [due, fresh, introduced, reviewedToday, total] = await Promise.all([
    cards(db).countDocuments({ userId: user._id, 'fsrs.state': { $ne: State.New }, 'fsrs.due': { $lte: now } }),
    cards(db).countDocuments({ userId: user._id, 'fsrs.state': State.New }),
    cards(db).countDocuments({ userId: user._id, introducedOn: today }),
    logs(db).countDocuments({ userId: user._id, date: today }),
    cards(db).countDocuments({ userId: user._id }),
  ]);
  const newToday = Math.min(fresh, Math.max(0, newPerDay - introduced));
  return { due, newToday, newWaiting: fresh, reviewedToday, total };
}

/** Today's session: cards that are due, then new cards up to the daily limit. */
export async function sessionCards(db: Db, user: WithId<UserDoc>, newPerDay: number, now = new Date()) {
  const counts = await cardCounts(db, user, newPerDay, now);
  const due = await cards(db)
    .find({ userId: user._id, 'fsrs.state': { $ne: State.New }, 'fsrs.due': { $lte: now } })
    .sort({ 'fsrs.due': 1 })
    .limit(MAX_SESSION)
    .toArray();
  const room = Math.max(0, Math.min(counts.newToday, MAX_SESSION - due.length));
  const waiting = room ? await cards(db).find({ userId: user._id, 'fsrs.state': State.New }).sort({ createdAt: 1, key: 1 }).limit(200).toArray() : [];
  const fresh = interleave(waiting).slice(0, room);
  return { counts, cards: [...due, ...fresh].map((c) => publicCard(c, now)) };
}

/**
 * Mixes new cards from different skills (grammar, vocabulary, reading…) instead of showing them in
 * blocks. Interleaved practice helps learners tell similar problems apart and remember them longer.
 */
function interleave<T extends { skill: string }>(list: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const c of list) groups.set(c.skill, [...(groups.get(c.skill) ?? []), c]);
  const out: T[] = [];
  const queues = [...groups.values()];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
}

const GRADES: Record<number, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy };

/**
 * Records a rating. `reps` must match the card's review count, so a double tap can't rate a card twice.
 * Returns the card's next state; `soon` means it is due again within 5 minutes, so it is shown again this session.
 */
export async function reviewCard(db: Db, user: WithId<UserDoc>, input: { cardId: string; rating: number; reps: number }, now = new Date()) {
  const grade = GRADES[input.rating];
  if (!grade) throw new HttpError(400, 'Choose Again, Hard, Good or Easy.', 'invalid_rating');
  if (!ObjectId.isValid(input.cardId)) throw new HttpError(404, 'That card was not found.', 'not_found');
  const card = await cards(db).findOne({ _id: new ObjectId(input.cardId), userId: user._id });
  if (!card) throw new HttpError(404, 'That card was not found.', 'not_found');
  if (card.fsrs.reps !== input.reps) throw new HttpError(409, 'That card was already reviewed.', 'stale');

  const { card: next, log } = scheduler.next(card.fsrs, now, grade);
  const today = localDate(user.timezone, now);
  const set: Partial<CardDoc> = { fsrs: next };
  if (card.introducedOn === null) set.introducedOn = today;
  const r = await cards(db).updateOne({ _id: card._id, 'fsrs.reps': input.reps }, { $set: set });
  if (r.matchedCount === 0) throw new HttpError(409, 'That card was already reviewed.', 'stale');
  await logs(db).insertOne({ userId: user._id, cardId: card._id, rating: grade, state: log.state, reviewedAt: now, scheduledDays: next.scheduled_days, date: today });

  const updated = { ...card, ...set } as WithId<CardDoc>;
  // Only a forgotten card comes back in the same session; one that is due in 10 minutes waits until then.
  return { card: publicCard(updated, now), due: next.due, soon: next.due.getTime() - now.getTime() < 5 * 60_000 };
}
