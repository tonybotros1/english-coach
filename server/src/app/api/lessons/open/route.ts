import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { openLesson } from '@/lib/lessons/service';

export const maxDuration = 120;

const body = z.object({ taskId: z.string().min(1).max(80) }).strict();

/** Opens the lesson for a plan task, writing it the first time. `{ status: 'generating' }` means try again in a few seconds. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const r = await openLesson(db, user, body.parse(await readJson(req)).taskId);
  return Response.json(r, { status: r.status === 'generating' ? 202 : 200 });
});

export const OPTIONS = preflight;
