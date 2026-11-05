import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { reviewCard } from '@/lib/cards';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

const body = z.object({ cardId: z.string(), rating: z.number().int().min(1).max(4), reps: z.number().int().min(0) }).strict();

/** Rates one card: 1 Again, 2 Hard, 3 Good, 4 Easy. `reps` is the card's review count when it was shown. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  return Response.json(await reviewCard(db, user, body.parse(await readJson(req))));
});

export const OPTIONS = preflight;
