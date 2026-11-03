import { profileUpdateSchema, publicUser, requireUser, type UserDoc } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ user: publicUser(user) });
});

export const PATCH = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const changes = profileUpdateSchema.parse(await readJson(req));
  const updated = await db
    .collection<UserDoc>('users')
    .findOneAndUpdate({ _id: user._id }, { $set: changes }, { returnDocument: 'after' });
  return Response.json({ user: publicUser(updated ?? user) });
});

export const OPTIONS = preflight;
