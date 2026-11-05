import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { startTest } from '@/lib/placement/service';

const body = z.object({ restart: z.boolean().optional() }).strict();

/** Resumes the unfinished test or starts a new one. Send `{ "restart": true }` to throw away the unfinished one. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const { restart } = body.parse(await readJson(req));
  return Response.json({ step: await startTest(db, user, { restart }) });
});

export const OPTIONS = preflight;
