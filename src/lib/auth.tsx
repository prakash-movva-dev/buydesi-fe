import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import { tokenStore } from './token-store';
import type { AuthSession, SafeUser } from '@/types/api';

interface AuthContextValue {
  user: SafeUser | null;
  isAuthenticated: boolean;
  loginWithPassword: (input: LoginInput) => Promise<SafeUser>;
  logout: () => Promise<void>;
}

export interface LoginInput {
  identifier: string;
  password: string;
  channel: 'email' | 'mobile';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SafeUser | null>(() => tokenStore.user);

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

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    // Best-effort server-side invalidation; never block the UI on it.
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }, { skipAuth: true }).catch(() => undefined);
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      loginWithPassword,
      logout,
    }),
    [user, loginWithPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
