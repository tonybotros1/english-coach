import type { z } from 'zod';

import { ConfigError, HttpError } from './errors';

export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Google renames Flash models often, so the models are settings. The "-latest" aliases follow the newest
 * Flash and Flash-Lite models; the previous 3.5 generation is usually less busy. When one is busy or out of
 * free quota, the next is tried. GEMINI_MODELS (comma-separated) replaces the whole list.
 */
const models = () =>
  process.env.GEMINI_MODELS?.split(',').map((m) => m.trim()).filter(Boolean) ?? [
    process.env.GEMINI_MODEL || 'gemini-flash-latest',
    'gemini-3.5-flash',
    process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
  ];
const RETRY_BUSY_MS = Number(process.env.GEMINI_RETRY_MS ?? 1500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A JSON schema in the OpenAPI subset that Gemini's `responseSchema` accepts. */
export type GeminiSchema = Record<string, unknown>;

type Part = { text?: string; thought?: boolean };
type GeminiResponse = { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };

/**
 * Asks Gemini for a JSON answer that matches `responseSchema`, then checks it with `parse`.
 * `system` holds the instructions; `user` holds the learner's material, which the model is told to treat as data.
 */
export async function generateJson<T>(opts: {
  system: string;
  user: string;
  responseSchema: GeminiSchema;
  parse: z.ZodType<T>;
  /** How long one model may take before the next is tried. */
  timeoutMs?: number;
  /** Total time across all models; no new model is started after this. */
  budgetMs?: number;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ConfigError('GEMINI_API_KEY');
  const started = Date.now();
  const budget = opts.budgetMs ?? 90_000;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: [{ text: opts.user }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: opts.responseSchema, temperature: 0.2 },
  });

  let lastStatus = 0;
  const call = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
    }).catch((e: unknown) => {
      console.error('Gemini request failed', model, e);
      return null;
    });
  for (const model of [...new Set(models())]) {
    if (Date.now() - started > budget) break;
    let res = await call(model);
    // "High demand" (503) spikes are usually brief: one short pause and retry before moving on.
    if (res?.status === 503) {
      await sleep(RETRY_BUSY_MS);
      res = await call(model);
    }
    if (!res) continue;
    lastStatus = res.status;
    // Quota used up, or this model name is not available to the key: try the next model.
    if (res.status === 429 || res.status === 404 || res.status >= 500) {
      console.warn('Gemini model unavailable', model, res.status);
      continue;
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.error('Gemini rejected the request', model, res.status, (await res.text()).slice(0, 400));
      throw new HttpError(502, 'The AI service rejected the server key. Check GEMINI_API_KEY.', 'ai_auth');
    }
    const json = (await res.json()) as GeminiResponse;
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
    if (!text) {
      console.error('Gemini returned no text', model, json.promptFeedback?.blockReason, json.candidates?.[0]?.finishReason);
      continue;
    }
    try {
      return opts.parse.parse(JSON.parse(text));
    } catch (e) {
      console.error('Gemini returned an unexpected shape', model, e, text.slice(0, 400));
      continue;
    }
  }
  if (lastStatus === 429) throw new HttpError(429, 'The free AI allowance is used up for now. Try again in a few minutes.', 'ai_quota');
  throw new HttpError(502, 'The AI service is busy right now. Try again in a minute.', 'ai_failed');
}
