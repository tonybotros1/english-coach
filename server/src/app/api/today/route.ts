import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { todaySummary } from '@/lib/plan/service';

/** Placement status, today's plan and review card counts, for the Today screen. */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json(await todaySummary(db, user));
});

export const OPTIONS = preflight;
