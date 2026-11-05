import { requireUser } from '@/lib/auth';
import { toAzureWav } from '@/lib/audio';
import { getDb } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { preflight, route } from '@/lib/http';
import { submitTalk } from '@/lib/lessons/service';

export const maxDuration = 60;

/** Multipart form: `lessonId`, `audio` and `lessonSeconds`. Scores the free answer and finishes the lesson. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Send the recording as a multipart form.', 'invalid_form');
  });
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, 'No recording was received. Record again.', 'no_audio');
  if (audio.size > 4 * 1024 * 1024) throw new HttpError(413, 'The recording is too long. Keep it under 30 seconds.', 'audio_too_large');
  const name = audio instanceof File ? audio.name : 'talk.m4a';
  const { wav, seconds } = await toAzureWav(Buffer.from(await audio.arrayBuffer()), name.split('.').pop() || 'm4a');
  const lesson = await submitTalk(db, user, { lessonId: form.get('lessonId'), wav, seconds, lessonSeconds: Number(form.get('lessonSeconds')) || 0 });
  return Response.json({ lesson });
});

export const OPTIONS = preflight;
