import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { completeWeekly } from '@/lib/lessons/weekly';

const body = z
  .object({ taskId: z.string().min(1).max(80), answers: z.array(z.number().int().min(-1).max(3)).max(20), seconds: z.number().min(0).max(24 * 3600) })
  .strict();

/** Scores the weekly quiz and ticks the task off. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ weekly: await completeWeekly(db, user, body.parse(await readJson(req))) });
});

export const OPTIONS = preflight;
