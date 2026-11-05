import { requireUser } from '@/lib/auth';
import { sessionCards } from '@/lib/cards';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { newCardsPerDay } from '@/lib/plan/engine';
import { activePlan } from '@/lib/plan/service';

/** Today's review session: due cards first, then new cards up to the daily limit. */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const plan = await activePlan(db, user._id);
  return Response.json(await sessionCards(db, user, newCardsPerDay(plan?.settings.minutes ?? 30)));
});

export const OPTIONS = preflight;
