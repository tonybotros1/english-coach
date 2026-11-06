// Gives a learner a new temporary password when they forget theirs (there is no email reset).
// Usage, from the server folder:
//   node scripts/reset-password.mjs learner@example.com --env .env.production.local
// The --env file must contain MONGODB_URI (and MONGODB_DB if it isn't english_coach).
// It prints the new password once: send it to the learner, and they change it under Progress > Account.
import { randomBytes, scrypt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--env')?.trim().toLowerCase();
const envIndex = args.indexOf('--env');
const envFile = envIndex >= 0 ? args[envIndex + 1] : '.env.local';
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/reset-password.mjs learner@example.com --env .env.production.local');
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim();
}
if (!env.MONGODB_URI) {
  console.error(`MONGODB_URI is not set in ${envFile}.`);
  process.exit(1);
}

// Same format and cost as hashPassword in src/lib/auth.ts.
const N = 65536, r = 8, p = 1, keylen = 64;
const password = randomBytes(9).toString('base64url'); // 12 characters
const salt = randomBytes(16);
const derived = await new Promise((resolve, reject) =>
  scrypt(password.normalize('NFKC'), salt, keylen, { N, r, p, maxmem: 256 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k))),
);
const passwordHash = ['scrypt', N, r, p, salt.toString('base64url'), derived.toString('base64url')].join('$');

const client = await MongoClient.connect(env.MONGODB_URI);
try {
  const users = client.db(env.MONGODB_DB || 'english_coach').collection('users');
  const { matchedCount } = await users.updateOne({ email }, { $set: { passwordHash, failedLogins: 0, lockedUntil: null } });
  if (!matchedCount) {
    console.error(`No account found for ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(`New temporary password for ${email}: ${password}`);
    console.log('Send it to them privately. They can change it under Progress > Account > Change password.');
  }
} finally {
  await client.close();
}
