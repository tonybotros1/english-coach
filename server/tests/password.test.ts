import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import {
  changePassword,
  hashPassword,
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  requestCode,
  requireUser,
  signInWithPassword,
  signUp,
  verifyCode,
  verifyPassword,
  type UserDoc,
} from '@/lib/auth';
import { ensureIndexes } from '@/lib/db';
import { HttpError } from '@/lib/errors';

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  process.env.AUTH_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
  mongo = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongo.getUri());
  db = client.db('english_coach_password_test');
  await ensureIndexes(db);
});
afterAll(async () => {
  await client?.close();
  await mongo?.stop();
});
beforeEach(async () => {
  await db.collection('users').deleteMany({});
  await db.collection('login_codes').deleteMany({});
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
const users = () => db.collection<UserDoc>('users');

describe('password hashing', () => {
  it('hashes with a random salt and verifies only the right password', async () => {
    const a = await hashPassword('correct horse');
    const b = await hashPassword('correct horse');
    expect(a).toMatch(/^scrypt\$65536\$8\$1\$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain('correct');
    expect(await verifyPassword('correct horse', a)).toBe(true);
    expect(await verifyPassword('correct horsf', a)).toBe(false);
    expect(await verifyPassword('correct horse', 'not-a-hash')).toBe(false);
  });
});

describe('sign up and sign in with a password', () => {
  it('creates an account, normalises the email and returns a working token', async () => {
    const { token, user } = await signUp(db, { email: ' Tony@Example.COM ', password: 'longenough', name: ' Tony ' });
    expect(user.email).toBe('tony@example.com');
    expect(user.name).toBe('Tony');
    expect(user).not.toHaveProperty('passwordHash');
    const loaded = await requireUser(new Request('http://x', { headers: { authorization: `Bearer ${token}` } }), db);
    expect(loaded.email).toBe('tony@example.com');
    const stored = await users().findOne({ email: 'tony@example.com' });
    expect(stored?.passwordHash).toMatch(/^scrypt\$/);
  });

  it('rejects short passwords, bad emails and a taken email', async () => {
    expect(await status(signUp(db, { email: 'tony@example.com', password: 'short' }))).toBe(400);
    expect(await status(signUp(db, { email: 'not-an-email', password: 'longenough' }))).toBe(400);
    await signUp(db, { email: 'tony@example.com', password: 'longenough' });
    expect(await status(signUp(db, { email: 'TONY@example.com', password: 'different1' }))).toBe(409);
    expect(await users().countDocuments()).toBe(1);
  });

  it('signs in with the right password and gives the same message for a wrong password or unknown email', async () => {
    const created = await signUp(db, { email: 'tony@example.com', password: 'longenough' });
    const ok = await signInWithPassword(db, { email: 'TONY@example.com', password: 'longenough' });
    expect(ok.user.id).toBe(created.user.id);

    const messages: string[] = [];
    for (const attempt of [
      { email: 'tony@example.com', password: 'wrongpassword' },
      { email: 'nobody@example.com', password: 'longenough' },
    ]) {
      try {
        await signInWithPassword(db, attempt);
      } catch (e) {
        expect((e as HttpError).status).toBe(401);
        messages.push((e as HttpError).message);
      }
    }
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe(messages[1]);
  });

  it('accounts made with an emailed code cannot be signed into with a password until one is set', async () => {
    let code = '';
    await requestCode(db, 'old@example.com', async (_e, c) => void (code = c));
    const { user } = await verifyCode(db, 'old@example.com', code);
    expect(await status(signInWithPassword(db, { email: 'old@example.com', password: 'anything1' }))).toBe(401);
    expect(await status(signUp(db, { email: 'old@example.com', password: 'longenough' }))).toBe(409);

    const doc = await users().findOne({ email: user.email });
    await changePassword(db, doc!, { next: 'newpassword' });
    expect(await status(signInWithPassword(db, { email: 'old@example.com', password: 'newpassword' }))).toBe(200);
  });

  it('locks the account after too many wrong passwords, then lets it in again later', async () => {
    await signUp(db, { email: 'tony@example.com', password: 'longenough' });
    const t0 = new Date('2026-11-06T08:00:00Z');
    for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
      expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'wrongpassword' }, t0))).toBe(401);
    }
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'wrongpassword' }, t0))).toBe(429);
    // Even the right password waits until the lock ends.
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'longenough' }, t0))).toBe(429);
    const later = new Date(t0.getTime() + (LOCK_MINUTES + 1) * 60_000);
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'longenough' }, later))).toBe(200);
  });

  it('a successful sign-in resets the count of wrong passwords', async () => {
    await signUp(db, { email: 'tony@example.com', password: 'longenough' });
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await status(signInWithPassword(db, { email: 'tony@example.com', password: 'wrongpassword' }));
    await signInWithPassword(db, { email: 'tony@example.com', password: 'longenough' });
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'wrongpassword' }))).toBe(401);
  });

  it('changes the password only with the right current password', async () => {
    await signUp(db, { email: 'tony@example.com', password: 'longenough' });
    const doc = (await users().findOne({ email: 'tony@example.com' }))!;
    expect(await status(changePassword(db, doc, { current: 'wrongpassword', next: 'brandnew99' }))).toBe(401);
    expect(await status(changePassword(db, doc, { current: 'longenough', next: 'short' }))).toBe(400);
    await changePassword(db, doc, { current: 'longenough', next: 'brandnew99' });
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'longenough' }))).toBe(401);
    expect(await status(signInWithPassword(db, { email: 'tony@example.com', password: 'brandnew99' }))).toBe(200);
  });
});
