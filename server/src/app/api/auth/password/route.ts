import { changePassword, requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const body = (await readJson(req)) as { current?: unknown; next?: unknown };
  return Response.json(await changePassword(db, user, body));
});
export const OPTIONS = preflight;
