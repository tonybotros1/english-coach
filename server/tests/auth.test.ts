import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import { MAX_ATTEMPTS, MAX_CODES_PER_HOUR, requestCode, requireUser, verifyCode } from '@/lib/auth';
import { ensureIndexes } from '@/lib/db';
import { HttpError } from '@/lib/errors';

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
const sent: { email: string; code: string }[] = [];
const send = async (email: string, code: string) => {
  sent.push({ email, code });
};

beforeAll(async () => {
  process.env.AUTH_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
  mongo = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongo.getUri());
  db = client.db('english_coach_test');
  await ensureIndexes(db);
});
afterAll(async () => {
  await client?.close();
  await mongo?.stop();
});
beforeEach(async () => {
  sent.length = 0;
  await db.collection('login_codes').deleteMany({});
  await db.collection('users').deleteMany({});
});

const status = async (p: Promise<unknown>) => {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof HttpError) return e.status;
    return 400;
  }
};

describe('sign-in with an emailed code', () => {
  it('sends a 6-digit code and normalises the email', async () => {
    const r = await requestCode(db, '  Tony@Example.COM ', send);
    expect(r.email).toBe('tony@example.com');
    expect(sent[0].code).toMatch(/^\d{6}$/);
    const stored = await db.collection('login_codes').findOne({ email: 'tony@example.com' });
    expect(stored?.codeHash).toBeTruthy();
    expect(stored?.codeHash).not.toContain(sent[0].code);
  });

  it('rejects an invalid email', async () => {
    expect(await status(requestCode(db, 'not-an-email', send))).toBe(400);
  });

  it('creates the account on first sign-in and returns a token that works', async () => {
    await requestCode(db, 'tony@example.com', send);
    const { token, user } = await verifyCode(db, 'tony@example.com', sent[0].code);
    expect(user.email).toBe('tony@example.com');
    const req = new Request('http://x/api/me', { headers: { authorization: `Bearer ${token}` } });
    const loaded = await requireUser(req, db);
    expect(loaded.email).toBe('tony@example.com');
    expect(await db.collection('users').countDocuments()).toBe(1);
  });

  it('signs in the same account again without creating a duplicate', async () => {
    await requestCode(db, 'tony@example.com', send);
    const a = await verifyCode(db, 'tony@example.com', sent[0].code);
    await requestCode(db, 'TONY@example.com', send);
    const b = await verifyCode(db, 'tony@example.com', sent[1].code);
    expect(a.user.id).toBe(b.user.id);
    expect(await db.collection('users').countDocuments()).toBe(1);
  });

  it('a code works only once', async () => {
    await requestCode(db, 'tony@example.com', send);
    await verifyCode(db, 'tony@example.com', sent[0].code);
    expect(await status(verifyCode(db, 'tony@example.com', sent[0].code))).toBe(401);
  });

  it('a newer code replaces the older one', async () => {
    await requestCode(db, 'tony@example.com', send);
    await requestCode(db, 'tony@example.com', send);
    expect(await status(verifyCode(db, 'tony@example.com', sent[0].code === sent[1].code ? '000000' : sent[0].code))).toBe(401);
    expect(await status(verifyCode(db, 'tony@example.com', sent[1].code))).toBe(200);
  });

  it('expires codes after 10 minutes', async () => {
    const t0 = new Date('2026-11-03T08:00:00Z');
    await requestCode(db, 'tony@example.com', send, t0);
    const later = new Date(t0.getTime() + 11 * 60_000);
    expect(await status(verifyCode(db, 'tony@example.com', sent[0].code, later))).toBe(401);
  });

  it('locks the code after too many wrong attempts', async () => {
    await requestCode(db, 'tony@example.com', send);
    const wrong = sent[0].code === '111111' ? '222222' : '111111';
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect(await status(verifyCode(db, 'tony@example.com', wrong))).toBe(401);
    expect(await status(verifyCode(db, 'tony@example.com', sent[0].code))).toBe(429);
  });

  it('limits how many codes can be requested per hour', async () => {
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) await requestCode(db, 'tony@example.com', send);
    expect(await status(requestCode(db, 'tony@example.com', send))).toBe(429);
  });

  it('rejects missing, malformed and forged tokens', async () => {
    const mk = (h?: string) => new Request('http://x', { headers: h ? { authorization: h } : {} });
    expect(await status(requireUser(mk(), db))).toBe(401);
    expect(await status(requireUser(mk('Bearer nonsense'), db))).toBe(401);
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ.c2lnbmF0dXJl';
    expect(await status(requireUser(mk(`Bearer ${forged}`), db))).toBe(401);
  });
});
