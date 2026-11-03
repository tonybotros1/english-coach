import { verifyCode } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

export const POST = route(async (req) => {
  const body = (await readJson(req)) as { email?: unknown; code?: unknown };
  const db = await getDb();
  return Response.json(await verifyCode(db, body.email, body.code));
});
export const OPTIONS = preflight;
