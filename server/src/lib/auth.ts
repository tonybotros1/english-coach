import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { ObjectId, type Db, type WithId } from 'mongodb';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { ConfigError, HttpError } from './errors';

export const CODE_TTL_MINUTES = 10;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;
const TOKEN_LIFETIME = '60d';
const ISSUER = 'english-coach';

export type UserDoc = {
  email: string;
  name: string | null;
  timezone: string | null;
  emailOptIn: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  /** scrypt hash, see hashPassword. Missing for accounts made with an emailed code. */
  passwordHash?: string;
  failedLogins?: number;
  lockedUntil?: Date | null;
};

type CodeDoc = {
  email: string;
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  superseded: boolean;
  usedAt?: Date;
};

export type PublicUser = { id: string; email: string; name: string | null; timezone: string | null; emailOptIn: boolean };

export const publicUser = (u: WithId<UserDoc>): PublicUser => ({
  id: u._id.toHexString(),
  email: u.email,
  name: u.name,
  timezone: u.timezone,
  emailOptIn: u.emailOptIn,
});

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new ConfigError('AUTH_SECRET (at least 32 characters)');
  return s;
}
const key = () => new TextEncoder().encode(secret());

const emailSchema = z.string({ error: 'Enter your email address.' }).trim().toLowerCase().pipe(z.email({ error: 'Enter a valid email address.' }));
const codeSchema = z.string({ error: 'Enter the 6-digit code.' }).trim().regex(/^\d{6}$/, { error: 'The code has 6 digits.' });

export const hashCode = (email: string, code: string) => createHmac('sha256', secret()).update(`${email}:${code}`).digest('hex');

/** Creates a new 6-digit sign-in code and hands it to `send`. Returns the code for local development only. */
export async function requestCode(db: Db, rawEmail: unknown, send: (email: string, code: string) => Promise<void>, now = new Date()) {
  const email = emailSchema.parse(rawEmail);
  const codes = db.collection<CodeDoc>('login_codes');
  const recent = await codes.countDocuments({ email, createdAt: { $gt: new Date(now.getTime() - 3600_000) } });
  if (recent >= MAX_CODES_PER_HOUR) throw new HttpError(429, 'Too many codes were requested. Wait an hour, then try again.', 'rate_limited');

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await codes.updateMany({ email, superseded: false }, { $set: { superseded: true } });
  await codes.insertOne({
    email,
    codeHash: hashCode(email, code),
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
    attempts: 0,
    superseded: false,
  });
  await send(email, code);
  return { email, code };
}

/** Checks a sign-in code, creates the account on first sign-in, and returns a session token. */
export async function verifyCode(db: Db, rawEmail: unknown, rawCode: unknown, now = new Date()) {
  const email = emailSchema.parse(rawEmail);
  const code = codeSchema.parse(rawCode);
  const codes = db.collection<CodeDoc>('login_codes');
  const doc = await codes.findOne(
    { email, superseded: false, usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { sort: { createdAt: -1 } },
  );
  if (!doc) throw new HttpError(401, 'This code has expired. Request a new one.', 'code_expired');
  if (doc.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Request a new code.', 'too_many_attempts');

  const expected = Buffer.from(doc.codeHash, 'hex');
  const given = Buffer.from(hashCode(email, code), 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await codes.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    throw new HttpError(401, 'That code is not right. Check the email and try again.', 'wrong_code');
  }
  await codes.updateOne({ _id: doc._id }, { $set: { usedAt: now } });

  const user = await db.collection<UserDoc>('users').findOneAndUpdate(
    { email },
    {
      $setOnInsert: { email, name: null, timezone: null, emailOptIn: true, createdAt: now },
      $set: { lastLoginAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!user) throw new HttpError(500, 'Could not create your account. Try again.');
  return { token: await signToken(user), user: publicUser(user) };
}

export async function signToken(user: WithId<UserDoc>): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user._id.toHexString())
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .sign(key());
}

/** Reads the Bearer token from a request and loads the signed-in user, or throws 401. */
export async function requireUser(req: Request, db: Db): Promise<WithId<UserDoc>> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Sign in to continue.', 'unauthenticated');
  let sub: string | undefined;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, algorithms: ['HS256'] });
    sub = payload.sub;
  } catch {
    throw new HttpError(401, 'Your session has ended. Sign in again.', 'session_expired');
  }
  if (!sub || !ObjectId.isValid(sub)) throw new HttpError(401, 'Your session has ended. Sign in again.', 'session_expired');
  const user = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(sub) });
  if (!user) throw new HttpError(401, 'Your account was not found. Sign in again.', 'session_expired');
  return user;
}

/* ---------- Email and password ---------- */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const MAX_FAILED_LOGINS = 10;
export const LOCK_MINUTES = 15;

// scrypt cost N = 2^16 (64 MiB, about 0.1 s), above the OWASP minimum. Stored with each hash so it can be raised later.
const SCRYPT = { N: 65536, r: 8, p: 1, keylen: 64 };

const passwordSchema = z
  .string({ error: 'Enter a password.' })
  .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters for your password.` })
  .max(PASSWORD_MAX, { error: `Use at most ${PASSWORD_MAX} characters for your password.` });
const nameSchema = z.string().trim().max(60, { error: 'Use at most 60 characters for your name.' }).optional();

const scryptAsync = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, keylen, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, derived) => (err ? reject(err) : resolve(derived))),
  );

/** Returns "scrypt$N$r$p$salt$hash" (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), derived.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const derived = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** A hash of a random password, checked for unknown emails so they take as long as known ones. */
let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

const wrongPassword = () => new HttpError(401, 'The email or password is not right.', 'wrong_password');
const emailTaken = () => new HttpError(409, 'An account with this email already exists. Sign in instead.', 'email_taken');

/** Creates an account with a password and returns a session token. */
export async function signUp(db: Db, raw: { email?: unknown; password?: unknown; name?: unknown }, now = new Date()) {
  const email = emailSchema.parse(raw.email);
  const password = passwordSchema.parse(raw.password);
  const name = nameSchema.parse(raw.name ?? undefined) || null;
  const users = db.collection<UserDoc>('users');
  if (await users.findOne({ email }, { projection: { _id: 1 } })) throw emailTaken();
  const doc: UserDoc = {
    email,
    name,
    timezone: null,
    emailOptIn: true,
    createdAt: now,
    lastLoginAt: now,
    passwordHash: await hashPassword(password),
    failedLogins: 0,
    lockedUntil: null,
  };
  try {
    const { insertedId } = await users.insertOne(doc);
    const user = { ...doc, _id: insertedId };
    return { token: await signToken(user), user: publicUser(user) };
  } catch (e) {
    // Two sign-ups for the same email at the same moment: the unique index decides.
    if ((e as { code?: number }).code === 11000) throw emailTaken();
    throw e;
  }
}

/** Checks an email and password and returns a session token. Locks the account for a while after repeated failures. */
export async function signInWithPassword(db: Db, raw: { email?: unknown; password?: unknown }, now = new Date()) {
  const email = emailSchema.parse(raw.email);
  const password = z.string({ error: 'Enter your password.' }).min(1, { error: 'Enter your password.' }).max(PASSWORD_MAX).parse(raw.password);
  const users = db.collection<UserDoc>('users');
  const user = await users.findOne({ email });
  if (!user?.passwordHash) {
    await verifyPassword(password, await dummy());
    throw wrongPassword();
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000));
    throw new HttpError(429, `Too many wrong passwords. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`, 'locked');
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = (user.failedLogins ?? 0) + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await users.updateOne(
      { _id: user._id },
      { $set: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null } },
    );
    if (lock) throw new HttpError(429, `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`, 'locked');
    throw wrongPassword();
  }
  await users.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockedUntil: null, lastLoginAt: now } });
  return { token: await signToken(user), user: publicUser(user) };
}

/** Changes the signed-in user's password after checking the current one. */
export async function changePassword(db: Db, user: WithId<UserDoc>, raw: { current?: unknown; next?: unknown }) {
  const next = passwordSchema.parse(raw.next);
  const current = z.string().max(PASSWORD_MAX).optional().parse(raw.current ?? undefined) ?? '';
  // Accounts made with an emailed code have no password yet, so they can set one without the current one.
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) {
    throw new HttpError(401, 'Your current password is not right.', 'wrong_password');
  }
  await db
    .collection<UserDoc>('users')
    .updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(next), failedLogins: 0, lockedUntil: null } });
  return { ok: true as const };
}

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    timezone: z
      .string()
      .max(64)
      .refine((tz) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, { error: 'That time zone is not recognised.' })
      .optional(),
    emailOptIn: z.boolean().optional(),
  })
  .strict();
