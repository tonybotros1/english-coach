import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, authApi, type User } from './api';
import { storage } from './storage';

const TOKEN_KEY = 'ec_token';
const USER_KEY = 'ec_user';

type Session = {
  status: 'loading' | 'signedOut' | 'signedIn';
  token: string | null;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (changes: Partial<Pick<User, 'name' | 'timezone' | 'emailOptIn'>>) => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Session['status']>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const remember = useCallback(async (t: string, u: User) => {
    await storage.set(TOKEN_KEY, t);
    await storage.set(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    await storage.remove(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  /** Saves the phone's time zone once, so the morning email arrives at 7:00 local time. */
  const syncTimezone = useCallback(async (t: string, u: User) => {
    const tz = deviceTimezone();
    if (!tz || u.timezone === tz) return;
    try {
      const { user: updated } = await authApi.updateMe(t, { timezone: tz });
      await remember(t, updated);
    } catch {}
  }, [remember]);

  useEffect(() => {
    (async () => {
      const t = await storage.get(TOKEN_KEY);
      if (!t) return setStatus('signedOut');
      const cached = await storage.get(USER_KEY);
      if (cached) {
        setToken(t);
        setUser(JSON.parse(cached) as User);
        setStatus('signedIn');
      }
      try {
        const { user: fresh } = await authApi.me(t);
        await remember(t, fresh);
        syncTimezone(t, fresh);
      } catch (e) {
        // Signed out on the server: clear. Offline: keep the cached session.
        if (e instanceof ApiError && e.status === 401) await signOut();
        else if (!cached) setStatus('signedOut');
      }
    })();
  }, [remember, signOut, syncTimezone]);

  const signIn = useCallback(async (t: string, u: User) => {
    await remember(t, u);
    syncTimezone(t, u);
  }, [remember, syncTimezone]);

  const updateProfile = useCallback<Session['updateProfile']>(async (changes) => {
    if (!token) return;
    const { user: updated } = await authApi.updateMe(token, changes);
    await remember(token, updated);
  }, [token, remember]);

  const value = useMemo(() => ({ status, token, user, signIn, signOut, updateProfile }), [status, token, user, signIn, signOut, updateProfile]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
