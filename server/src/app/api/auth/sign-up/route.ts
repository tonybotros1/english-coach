import { signUp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { preflight, readJson, route } from '@/lib/http';

export const POST = route(async (req) => {
  const body = (await readJson(req)) as { email?: unknown; password?: unknown; name?: unknown };
  return Response.json(await signUp(await getDb(), body), { status: 201 });
});
export const OPTIONS = preflight;
