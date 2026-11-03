import { requireUser } from '@/lib/auth';
import { toAzureWav } from '@/lib/audio';
import { assessPronunciation, isSpeechConfigured } from '@/lib/azureSpeech';
import { getDb } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { preflight, route } from '@/lib/http';

export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to about 4.5 MB.

/**
 * Scores a recording of the learner reading `referenceText` aloud.
 * Form fields: `audio` (file), `referenceText` (string). Add `?dryRun=1` to test
 * the upload and conversion without calling Azure.
 */
export const POST = route(async (req) => {
  const db = await getDb();
  await requireUser(req, db);

  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Send the recording as a multipart form.', 'invalid_form');
  });
  const audio = form.get('audio');
  const referenceText = String(form.get('referenceText') ?? '').trim();
  if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, 'No recording was received. Record again.', 'no_audio');
  if (audio.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'The recording is too long. Keep it under 30 seconds.', 'audio_too_large');
  if (!referenceText || referenceText.length > 400) throw new HttpError(400, 'The sentence to read is missing or too long.', 'bad_reference');

  const name = audio instanceof File ? audio.name : 'recording.m4a';
  const ext = name.includes('.') ? name.split('.').pop()! : 'm4a';
  const { wav, seconds } = await toAzureWav(Buffer.from(await audio.arrayBuffer()), ext);

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
  if (dryRun || !isSpeechConfigured()) {
    return Response.json({
      dryRun: true,
      speechConfigured: isSpeechConfigured(),
      received: { bytes: audio.size, type: audio.type || null, name },
      converted: { bytes: wav.length, seconds, format: 'wav pcm 16 kHz mono' },
    });
  }
  const assessment = await assessPronunciation(wav, referenceText);
  return Response.json({ dryRun: false, seconds, referenceText, ...assessment });
});

export const OPTIONS = preflight;
