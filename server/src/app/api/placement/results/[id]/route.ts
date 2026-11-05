import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { resultsOf } from '@/lib/placement/service';

export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '';
  return Response.json({ results: await resultsOf(db, user, decodeURIComponent(id)) });
});

export const OPTIONS = preflight;
