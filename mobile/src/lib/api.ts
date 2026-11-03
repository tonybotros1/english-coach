import { API_URL } from './config';

export type User = { id: string; email: string; name: string | null; timezone: string | null; emailOptIn: boolean };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; form?: FormData; token?: string | null; signal?: AbortSignal };

/** Calls the English Coach server and returns its JSON, or throws an ApiError with a message the user can read. */
export async function api<T>(path: string, { method = 'GET', body, form, token, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: form || body !== undefined ? (method === 'GET' ? 'POST' : method) : method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (e) {
    if (__DEV__) console.warn('[api] request failed', path, e);
    throw new ApiError(`Cannot reach the server at ${API_URL}. Check your internet connection, or that the server is running.`, 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error || `The server answered with an error (${res.status}).`, res.status, data.code || 'error');
  return data as T;
}

export const authApi = {
  requestCode: (email: string) => api<{ ok: true; email: string; devCode?: string }>('/api/auth/request-code', { method: 'POST', body: { email } }),
  verify: (email: string, code: string) => api<{ token: string; user: User }>('/api/auth/verify', { method: 'POST', body: { email, code } }),
  me: (token: string) => api<{ user: User }>('/api/me', { token }),
  updateMe: (token: string, changes: Partial<Pick<User, 'name' | 'timezone' | 'emailOptIn'>>) =>
    api<{ user: User }>('/api/me', { method: 'PATCH', body: changes, token }),
};
