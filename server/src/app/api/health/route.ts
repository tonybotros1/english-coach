import { pingDb } from '@/lib/db';
import { isEmailConfigured } from '@/lib/email';
import { isSpeechConfigured } from '@/lib/azureSpeech';
import { preflight, route } from '@/lib/http';

export const GET = route(async () => {
  const db = await pingDb();
  return Response.json({
    ok: db !== 'down',
    db,
    services: {
      email: isEmailConfigured(),
      speech: isSpeechConfigured(),
      ai: Boolean(process.env.GEMINI_API_KEY),
      auth: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32),
    },
  });
});
export const OPTIONS = preflight;
