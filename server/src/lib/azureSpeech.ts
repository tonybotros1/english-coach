import { ConfigError, HttpError } from './errors';

export const isSpeechConfigured = () => Boolean(process.env.AZURE_SPEECH_KEY && (process.env.AZURE_SPEECH_REGION || process.env.AZURE_SPEECH_ENDPOINT));

export type WordScore = { word: string; accuracy: number | null; errorType: string };
export type Assessment = {
  status: string;
  recognized: string;
  scores: { pronunciation: number | null; accuracy: number | null; fluency: number | null; completeness: number | null; prosody: number | null };
  words: WordScore[];
};

function endpoint(): string {
  const custom = process.env.AZURE_SPEECH_ENDPOINT?.replace(/\/+$/, '');
  const path = 'speech/recognition/conversation/cognitiveservices/v1';
  // Custom-subdomain resources use /stt/<path>; classic regional resources use <region>.stt.speech.microsoft.com/<path>.
  const base = custom ? `${custom}/stt/${path}` : `https://${process.env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/${path}`;
  return `${base}?language=en-US&format=detailed`;
}

/** Scores how a learner read `referenceText` aloud. `wav` must be 16 kHz mono PCM WAV, 30 seconds or less. */
export async function assessPronunciation(wav: Buffer, referenceText: string): Promise<Assessment> {
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) throw new ConfigError('AZURE_SPEECH_KEY');
  if (!process.env.AZURE_SPEECH_REGION && !process.env.AZURE_SPEECH_ENDPOINT) throw new ConfigError('AZURE_SPEECH_REGION');

  const config = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
    EnableProsodyAssessment: 'True',
  };
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Pronunciation-Assessment': Buffer.from(JSON.stringify(config), 'utf8').toString('base64'),
      Accept: 'application/json',
    },
    body: new Uint8Array(wav),
  });
  if (res.status === 401 || res.status === 403) throw new HttpError(502, 'The speech service rejected the server key. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.', 'speech_auth');
  if (res.status === 429) throw new HttpError(429, 'The free speech allowance is used up for now. Try again later.', 'speech_quota');
  if (!res.ok) {
    console.error('Azure speech error', res.status, (await res.text()).slice(0, 400));
    throw new HttpError(502, 'The speech service could not score this recording. Try again.', 'speech_failed');
  }
  return normalizeAssessment(await res.json());
}

type Raw = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
/** Azure documents both a flat shape (scores on NBest[0]) and a nested one (under PronunciationAssessment). Accept either. */
const pick = (o: Raw | undefined, k: string) => num((o?.PronunciationAssessment as Raw | undefined)?.[k] ?? o?.[k]);

export function normalizeAssessment(json: unknown): Assessment {
  const j = (json ?? {}) as Raw;
  const status = String(j.RecognitionStatus ?? 'Unknown');
  const best = (Array.isArray(j.NBest) ? j.NBest[0] : undefined) as Raw | undefined;
  const words = (Array.isArray(best?.Words) ? best.Words : []) as Raw[];
  return {
    status: status === '0' ? 'Success' : status,
    recognized: String(j.DisplayText ?? best?.Display ?? ''),
    scores: {
      pronunciation: pick(best, 'PronScore'),
      accuracy: pick(best, 'AccuracyScore'),
      fluency: pick(best, 'FluencyScore'),
      completeness: pick(best, 'CompletenessScore'),
      prosody: pick(best, 'ProsodyScore'),
    },
    words: words.map((w) => ({
      word: String(w.Word ?? ''),
      accuracy: pick(w, 'AccuracyScore'),
      errorType: String(((w.PronunciationAssessment as Raw | undefined)?.ErrorType ?? w.ErrorType) || 'None'),
    })),
  };
}
