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

/** Sends 16 kHz mono PCM WAV (30 seconds or less) to Azure's short-audio API, with or without pronunciation scoring. */
async function recognize(wav: Buffer, assessment: Record<string, string> | null): Promise<unknown> {
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) throw new ConfigError('AZURE_SPEECH_KEY');
  if (!process.env.AZURE_SPEECH_REGION && !process.env.AZURE_SPEECH_ENDPOINT) throw new ConfigError('AZURE_SPEECH_REGION');
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': key,
    'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    Accept: 'application/json',
  };
  if (assessment) headers['Pronunciation-Assessment'] = Buffer.from(JSON.stringify(assessment), 'utf8').toString('base64');
  const res = await fetch(endpoint(), { method: 'POST', headers, body: new Uint8Array(wav) });
  if (res.status === 401 || res.status === 403) throw new HttpError(502, 'The speech service rejected the server key. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.', 'speech_auth');
  if (res.status === 429) throw new HttpError(429, 'The free speech allowance is used up for now. Try again later.', 'speech_quota');
  if (!res.ok) {
    console.error('Azure speech error', res.status, (await res.text()).slice(0, 400));
    throw new HttpError(502, 'The speech service could not score this recording. Try again.', 'speech_failed');
  }
  return res.json();
}

const assessmentConfig = (referenceText: string) => ({
  ReferenceText: referenceText,
  GradingSystem: 'HundredMark',
  Granularity: 'Word',
  Dimension: 'Comprehensive',
  EnableMiscue: 'True',
  EnableProsodyAssessment: 'True',
});

/** Scores how a learner read `referenceText` aloud. `wav` must be 16 kHz mono PCM WAV, 30 seconds or less. */
export async function assessPronunciation(wav: Buffer, referenceText: string): Promise<Assessment> {
  return normalizeAssessment(await recognize(wav, assessmentConfig(referenceText)));
}

/**
 * Scores free speech, where there is no script to compare with. Azure documents unscripted assessment
 * only for its SDK, so this uses two calls: first transcribe what was said, then score the pronunciation
 * against that transcript. Completeness is meaningless here and is dropped.
 */
export async function assessSpontaneous(wav: Buffer): Promise<Assessment> {
  const heard = normalizeAssessment(await recognize(wav, null));
  const transcript = heard.recognized.trim();
  if (heard.status !== 'Success' || !transcript) return { ...heard, recognized: transcript };
  const scored = normalizeAssessment(await recognize(wav, { ...assessmentConfig(transcript), EnableMiscue: 'False' }));
  return { ...scored, recognized: transcript, scores: { ...scored.scores, completeness: null } };
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
    // Azure joins sentences without a space ("Dubai.Every"); put the space back.
    recognized: String(j.DisplayText ?? best?.Display ?? '').replace(/([.!?])(?=[A-Za-z])/g, '$1 '),
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
