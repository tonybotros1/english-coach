import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';
import { abandonTest } from '@/lib/placement/service';

const body = z.object({ testId: z.string() }).strict();

export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  await abandonTest(db, user, body.parse(await readJson(req)).testId);
  return Response.json({ ok: true });
});

export const OPTIONS = preflight;
