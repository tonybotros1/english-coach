import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { progressSummary } from '@/lib/progress';

/** Streak, weekly minutes, skill levels over time and review card statistics. */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json(await progressSummary(db, user));
});

export const OPTIONS = preflight;
