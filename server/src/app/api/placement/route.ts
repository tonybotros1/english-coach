import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { currentStep, latestSummary } from '@/lib/placement/service';

/** The unfinished test's current step (or null) and the latest completed result (or null). */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const [active, latest] = await Promise.all([currentStep(db, user), latestSummary(db, user._id)]);
  return Response.json({ active, latest });
});

export const OPTIONS = preflight;
