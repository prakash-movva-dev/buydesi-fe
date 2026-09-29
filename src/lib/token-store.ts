import type { AuthTokens, SafeUser } from '@/types/api';

// Stored in localStorage so a page refresh keeps the session. The refresh
// token is JWT-based and rotated server-side on each /auth/refresh call —
// XSS risk is the only real downside vs httpOnly cookies, which would
// require extra backend wiring (CSRF token, SameSite tuning). Revisit
// when we ship to production behind a single origin.
const ACCESS_KEY = 'buydesi.accessToken';
const REFRESH_KEY = 'buydesi.refreshToken';
const USER_KEY = 'buydesi.user';
const SUPPORT_KEY = 'buydesi.supportSession';

/**
 * A support admin working inside a seller's account.
 *
 * Held beside the admin's own session rather than replacing it: they are still
 * themselves, and ending the session has to put them straight back where they
 * were rather than at a login screen.
 *
 * There is no refresh token here on purpose. The server issues none, so when
 * this expires the session is genuinely over and continuing means asking the
 * seller for a new PIN.
 */
export interface SupportSession {
  accessToken: string;
  expiresAt: string;
  sellerId: string;
  sellerName: string;
  ticketId: string;
}

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
  get supportSession(): SupportSession | null {
    const raw = localStorage.getItem(SUPPORT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SupportSession;
      // An expired session is no session. Reading it out is the last moment we
      // can notice before a request goes out under it.
      if (new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem(SUPPORT_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setSupportSession(session: SupportSession): void {
    localStorage.setItem(SUPPORT_KEY, JSON.stringify(session));
  },
  clearSupportSession(): void {
    localStorage.removeItem(SUPPORT_KEY);
  },
  setUser(user: SafeUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(SUPPORT_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
