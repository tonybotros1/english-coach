import { requestCode } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { devCodesEnabled, sendLoginCode } from '@/lib/email';
import { preflight, readJson, route } from '@/lib/http';

export const POST = route(async (req) => {
  const body = (await readJson(req)) as { email?: unknown };
  const db = await getDb();
  const { email, code } = await requestCode(db, body.email, sendLoginCode);
  // Local development without Resend: return the code so the app can be tested without email.
  return Response.json({ ok: true, email, ...(devCodesEnabled() ? { devCode: code } : {}) });
});
export const OPTIONS = preflight;
