import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
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
