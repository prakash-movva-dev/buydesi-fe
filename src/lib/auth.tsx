import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { tokenStore, type SupportSession } from './token-store';
import { UserRole, type AuthSession, type SafeUser } from '@/types/api';

interface AuthContextValue {
  /**
   * Who this session is acting as.
   *
   * While a support admin is working inside a seller's account this is the
   * SELLER, so every role gate and every seller screen behaves exactly as it
   * does for the seller — which is the point, and is what the server believes
   * too. {@link realUser} is who is actually at the keyboard.
   */
  user: SafeUser | null;
  /** The signed-in person, regardless of whose account they are working in. */
  realUser: SafeUser | null;
  /** Set while working inside a seller's account. */
  supportSession: SupportSession | null;
  startSupportSession: (session: SupportSession) => void;
  endSupportSession: () => void;
  isAuthenticated: boolean;
  loginWithPassword: (input: LoginInput) => Promise<SafeUser>;
  logout: () => Promise<void>;
  /** Adopt a freshly-read user, e.g. after someone edits their own profile. */
  applyUser: (user: SafeUser) => void;
}

export interface LoginInput {
  identifier: string;
  password: string;
  channel: 'email' | 'mobile';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SafeUser | null>(() => tokenStore.user);
  const [supportSession, setSupportSession] = useState<SupportSession | null>(
    () => tokenStore.supportSession,
  );

  const endSupportSession = useCallback(() => {
    tokenStore.clearSupportSession();
    setSupportSession(null);
  }, []);

  const startSupportSession = useCallback((session: SupportSession) => {
    tokenStore.setSupportSession(session);
    setSupportSession(session);
  }, []);

  // The API client clears the stored session when the server rejects it — the
  // seller revoked it, or the ticket closed — and says so. This keeps the UI
  // from carrying on as though the admin is still inside the account.
  useEffect(() => {
    const onEnded = () => setSupportSession(null);
    window.addEventListener('buydesi:support-session-ended', onEnded);
    return () => window.removeEventListener('buydesi:support-session-ended', onEnded);
  }, []);

  // And end it on the clock, so the banner never counts past zero.
  useEffect(() => {
    if (!supportSession) return undefined;
    const ms = new Date(supportSession.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      endSupportSession();
      return undefined;
    }
    const timer = setTimeout(endSupportSession, ms);
    return () => clearTimeout(timer);
  }, [supportSession, endSupportSession]);

  const loginWithPassword = useCallback(async (input: LoginInput): Promise<SafeUser> => {
    const body =
      input.channel === 'email'
        ? { email: input.identifier, password: input.password }
        : { mobile: input.identifier, password: input.password };
    const session = await api.post<AuthSession>('/auth/login', body, { skipAuth: true });
    tokenStore.setSession(session.user, session.tokens);
    setUser(session.user);
    return session.user;
  }, []);

  const applyUser = useCallback((next: SafeUser) => {
    tokenStore.setUser(next);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    // Best-effort server-side invalidation; never block the UI on it.
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }, { skipAuth: true }).catch(() => undefined);
    }
    tokenStore.clear();
    setSupportSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const actingAs: SafeUser | null =
      supportSession && user
        ? {
            ...user,
            id: supportSession.sellerId,
            name: supportSession.sellerName,
            role: UserRole.SELLER,
          }
        : user;

    return {
      user: actingAs,
      realUser: user,
      supportSession,
      startSupportSession,
      endSupportSession,
      isAuthenticated: user !== null,
      loginWithPassword,
      logout,
      applyUser,
    };
  }, [
    user,
    supportSession,
    startSupportSession,
    endSupportSession,
    loginWithPassword,
    logout,
    applyUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
