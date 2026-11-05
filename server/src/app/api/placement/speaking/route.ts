import { requireUser } from '@/lib/auth';
import { toAzureWav } from '@/lib/audio';
import { getDb } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { preflight, route } from '@/lib/http';
import { submitSpeaking } from '@/lib/placement/service';

export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to about 4.5 MB.

/** Multipart form: `testId`, `taskIndex`, and either `audio` (file) or `skip=1`. */
export const POST = route(async (req) => {
  const db = await getDb();
  const user = await requireUser(req, db);
  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Send the recording as a multipart form.', 'invalid_form');
  });
  const skip = form.get('skip') === '1';
  let wav: Buffer | null = null;
  let seconds = 0;
  if (!skip) {
    const audio = form.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, 'No recording was received. Record again.', 'no_audio');
    if (audio.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'The recording is too long. Keep it under 30 seconds.', 'audio_too_large');
    const name = audio instanceof File ? audio.name : 'answer.m4a';
    const ext = name.includes('.') ? name.split('.').pop()! : 'm4a';
    ({ wav, seconds } = await toAzureWav(Buffer.from(await audio.arrayBuffer()), ext));
  }
  const step = await submitSpeaking(db, user, { testId: form.get('testId'), taskIndex: form.get('taskIndex'), skip, wav, seconds });
  return Response.json({ step });
});

export const OPTIONS = preflight;
