import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { completeLesson } from '@/lib/lessons/service';

const body = z
  .object({
    lessonId: z.string(),
    answers: z.array(z.number().int().min(-1).max(3)).max(20),
    dictation: z.array(z.string().max(400)).max(5).optional(),
    seconds: z.number().min(0).max(24 * 3600),
  })
  .strict();

/** Finishes a grammar, vocabulary, reading or listening lesson. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ lesson: await completeLesson(db, user, body.parse(await readJson(req))) });
});

export const OPTIONS = preflight;
