import { signInWithPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

export const POST = route(async (req) => {
  const body = (await readJson(req)) as { email?: unknown; password?: unknown };
  return Response.json(await signInWithPassword(await getDb(), body));
});
export const OPTIONS = preflight;
