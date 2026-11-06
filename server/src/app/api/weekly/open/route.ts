import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { openWeekly } from '@/lib/lessons/weekly';

const body = z.object({ taskId: z.string().min(1).max(80) }).strict();

/** Opens the weekly review for a plan task, building its quiz from the week's lessons the first time. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ weekly: await openWeekly(db, user, body.parse(await readJson(req)).taskId) });
});

export const OPTIONS = preflight;
