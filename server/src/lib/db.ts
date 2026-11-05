import { MongoClient, type Db } from 'mongodb';
import { ConfigError } from './errors';

type Cache = { client?: MongoClient; connecting?: Promise<MongoClient>; indexes?: Promise<void> };
// Reuse one client across hot reloads and warm serverless invocations.
const cache = (globalThis as unknown as { __englishCoachMongo?: Cache }).__englishCoachMongo ??= {};

export const dbName = () => process.env.MONGODB_DB || 'english_coach';
export const isDbConfigured = () => Boolean(process.env.MONGODB_URI);

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new ConfigError('MONGODB_URI');
  if (!cache.connecting) {
    cache.client = new MongoClient(uri, { appName: 'english-coach', maxPoolSize: 5 });
    cache.connecting = cache.client.connect().catch((e) => {
      cache.connecting = undefined;
      throw e;
    });
  }
  const client = await cache.connecting;
  const db = client.db(dbName());
  if (!cache.indexes) {
    cache.indexes = ensureIndexes(db).catch((e) => {
      cache.indexes = undefined;
      throw e;
    });
  }
  await cache.indexes;
  return db;
}

/** Creates the indexes the app relies on. Safe to run repeatedly. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    // MongoDB removes expired sign-in codes automatically.
    db.collection('login_codes').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('login_codes').createIndex({ email: 1, createdAt: -1 }),
    db.collection('placement_tests').createIndex({ userId: 1, status: 1, startedAt: -1 }),
    db.collection('plans').createIndex({ userId: 1, status: 1 }),
    db.collection('cards').createIndex({ userId: 1, key: 1 }, { unique: true }),
    db.collection('cards').createIndex({ userId: 1, 'fsrs.state': 1, 'fsrs.due': 1 }),
    db.collection('review_logs').createIndex({ userId: 1, date: 1 }),
    // One lesson per plan task: the unique index is also the lock that stops a lesson being written twice.
    db.collection('lessons').createIndex({ userId: 1, taskId: 1 }, { unique: true }),
    db.collection('lessons').createIndex({ userId: 1, planCreatedAt: 1, status: 1 }),
  ]);
}

export async function pingDb(): Promise<'up' | 'down' | 'not-configured'> {
  if (!isDbConfigured()) return 'not-configured';
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return 'up';
  } catch (e) {
    console.error('Database ping failed:', (e as Error).message);
    return 'down';
  }
}
