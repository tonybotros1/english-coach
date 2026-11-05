import { requireUser } from '@/lib/auth';
import { toAzureWav } from '@/lib/audio';
import { getDb } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { preflight, route } from '@/lib/http';
import { scoreShadowing } from '@/lib/lessons/service';

export const maxDuration = 30;

/** Multipart form: `lessonId`, `index` and `audio`. Scores one repeated sentence. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Send the recording as a multipart form.', 'invalid_form');
  });
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, 'No recording was received. Record again.', 'no_audio');
  if (audio.size > 4 * 1024 * 1024) throw new HttpError(413, 'The recording is too long.', 'audio_too_large');
  const name = audio instanceof File ? audio.name : 'shadow.m4a';
  const { wav } = await toAzureWav(Buffer.from(await audio.arrayBuffer()), name.split('.').pop() || 'm4a');
  return Response.json({ result: await scoreShadowing(db, user, { lessonId: form.get('lessonId'), index: Number(form.get('index')), wav }) });
});

export const OPTIONS = preflight;
