import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { WRITING_MAX_CHARS } from '@/lib/placement/bank/prompts';
import { submitWriting } from '@/lib/placement/service';

export const maxDuration = 60;

const body = z.object({ testId: z.string(), text: z.string().max(WRITING_MAX_CHARS + 500, { error: 'Your text is too long.' }) }).strict();

export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json({ step: await submitWriting(db, user, body.parse(await readJson(req))) });
});

export const OPTIONS = preflight;
