import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { submitLessonWriting } from '@/lib/lessons/service';

export const maxDuration = 60;

const body = z
  .object({ lessonId: z.string(), text: z.string().max(5000, { error: 'Your text is too long.' }), seconds: z.number().min(0).max(24 * 3600) })
  .strict();

/** Grades a writing lesson with AI feedback, corrections and an improved version, and finishes it. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ lesson: await submitLessonWriting(db, user, body.parse(await readJson(req))) });
});

export const OPTIONS = preflight;
