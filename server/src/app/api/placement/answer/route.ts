import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { answerQuestion } from '@/lib/placement/service';

const body = z.object({ testId: z.string(), itemId: z.string(), choice: z.number().int().min(0).max(3) }).strict();

export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ step: await answerQuestion(db, user, body.parse(await readJson(req))) });
});

export const OPTIONS = preflight;
