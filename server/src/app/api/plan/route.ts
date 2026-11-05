import { requireUser } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { latestSummary } from '@/lib/placement/service';
import { activePlan, createPlan, planView, setupDefaults } from '@/lib/plan/service';

/** The active plan, or null, plus setup defaults from the latest placement result (null if no test yet). */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const [doc, placement] = await Promise.all([activePlan(db, user._id), latestSummary(db, user._id)]);
  const today = localDate(user.timezone);
  return Response.json({ plan: doc ? planView(doc, today) : null, setup: placement ? setupDefaults(placement) : null });
});

/** Builds a new 12-week plan: `{ goal, target, minutes, days }`. Replaces the active plan. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const doc = await createPlan(db, user, await readJson(req));
  return Response.json({ plan: planView(doc, localDate(user.timezone)) });
});

export const OPTIONS = preflight;
