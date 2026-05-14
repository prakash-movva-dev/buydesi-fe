import type { AuthTokens, SafeUser } from '@/types/api';

// Stored in localStorage so a page refresh keeps the session. The refresh
// token is JWT-based and rotated server-side on each /auth/refresh call —
// XSS risk is the only real downside vs httpOnly cookies, which would
// require extra backend wiring (CSRF token, SameSite tuning). Revisit
// when we ship to production behind a single origin.
const ACCESS_KEY = 'buydesi.accessToken';
const REFRESH_KEY = 'buydesi.refreshToken';
const USER_KEY = 'buydesi.user';

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  get user(): SafeUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SafeUser;
    } catch {
      return null;
    }
  },
  setSession(user: SafeUser, tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setTokens(tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'>): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  setUser(user: SafeUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
