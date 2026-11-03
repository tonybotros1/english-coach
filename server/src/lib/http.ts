import { ZodError } from 'zod';
import { ConfigError, HttpError } from './errors';

function allowedOrigins(): string[] {
  const fallback = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8081';
  return (process.env.CORS_ORIGINS || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** CORS headers for the Expo web preview. Native apps do not send an Origin and need none. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export const preflight = (req: Request) => new Response(null, { status: 204, headers: corsHeaders(req) });

function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return Response.json({ error: first?.message || 'The request is not valid.', code: 'invalid_request' }, { status: 400 });
  }
  if (e instanceof ConfigError) {
    console.error(e.message);
    return Response.json({ error: e.message, code: 'not_configured' }, { status: 503 });
  }
  console.error('Unhandled error:', e);
  return Response.json({ error: 'Something went wrong on the server. Try again.', code: 'server_error' }, { status: 500 });
}

/** Wraps a route handler with error mapping and CORS headers. */
export function route(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    let res: Response;
    try {
      res = await fn(req);
    } catch (e) {
      res = errorResponse(e);
    }
    for (const [k, v] of Object.entries(corsHeaders(req))) res.headers.set(k, v);
    return res;
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'The request body must be JSON.', 'invalid_json');
  }
}
