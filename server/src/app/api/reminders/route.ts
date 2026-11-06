import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, route } from '@/lib/http';
import { upcomingReminders } from '@/lib/progress';

/** The text of the next 7 morning reminders, which the phone schedules as local notifications. */
export const GET = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const days = Math.max(1, Math.min(14, Number(new URL(req.url).searchParams.get('days')) || 7));
  return Response.json({ reminders: await upcomingReminders(db, user, days) });
});

export const OPTIONS = preflight;
