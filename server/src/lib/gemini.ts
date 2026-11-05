import type { z } from 'zod';

import { ConfigError, HttpError } from './errors';

export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Google renames Flash models often, so the model is a setting. The "-latest" aliases follow the newest
 * Flash and Flash-Lite models. When the main model's free quota runs out, the lighter one is tried.
 */
const models = () => [process.env.GEMINI_MODEL || 'gemini-flash-latest', process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest'];

/** A JSON schema in the OpenAPI subset that Gemini's `responseSchema` accepts. */
export type GeminiSchema = Record<string, unknown>;

type Part = { text?: string; thought?: boolean };
type GeminiResponse = { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };

/**
 * Asks Gemini for a JSON answer that matches `responseSchema`, then checks it with `parse`.
 * `system` holds the instructions; `user` holds the learner's material, which the model is told to treat as data.
 */
export async function generateJson<T>(opts: { system: string; user: string; responseSchema: GeminiSchema; parse: z.ZodType<T>; timeoutMs?: number }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ConfigError('GEMINI_API_KEY');
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: [{ text: opts.user }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: opts.responseSchema, temperature: 0.2 },
  });

  let lastStatus = 0;
  for (const model of [...new Set(models())]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
    }).catch((e: unknown) => {
      console.error('Gemini request failed', model, e);
      return null;
    });
    if (!res) continue;
    lastStatus = res.status;
    // Quota used up, or this model name is not available to the key: try the next model.
    if (res.status === 429 || res.status === 404 || res.status >= 500) {
      console.warn('Gemini model unavailable', model, res.status);
      continue;
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.error('Gemini rejected the request', model, res.status, (await res.text()).slice(0, 400));
      throw new HttpError(502, 'The AI grader rejected the server key. Check GEMINI_API_KEY.', 'ai_auth');
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
  if (lastStatus === 429) throw new HttpError(429, 'The free AI grading allowance is used up for now. Try again in a few minutes.', 'ai_quota');
  throw new HttpError(502, 'The AI grader is not answering right now. Try again in a minute.', 'ai_failed');
}
