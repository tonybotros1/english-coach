import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { getDb } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { preflight, readJson, route } from '@/lib/http';
import { startTest } from '@/lib/placement/service';
import { activePlan } from '@/lib/plan/service';

const body = z.object({ restart: z.boolean().optional(), checkpointTaskId: z.string().max(80).optional() }).strict();

/**
 * Resumes the unfinished test or starts a new one. `{ "restart": true }` throws away the unfinished one;
 * `{ "checkpointTaskId": "…" }` starts the plan's short checkpoint test.
 */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const { restart, checkpointTaskId } = body.parse(await readJson(req));
  if (checkpointTaskId) {
    const plan = await activePlan(db, user._id);
    const day = plan?.plan.weeks.flatMap((w) => w.days).find((d) => d.tasks.some((t) => t.id === checkpointTaskId && t.kind === 'checkpoint'));
    if (!day) throw new HttpError(404, 'That checkpoint is not in your current plan.', 'not_found');
    if (day.date > localDate(user.timezone)) throw new HttpError(409, 'The checkpoint opens on its day.', 'too_early');
  }
  return Response.json({ step: await startTest(db, user, { restart, checkpointTaskId }) });
});

export const OPTIONS = preflight;
