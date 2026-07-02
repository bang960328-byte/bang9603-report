import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { login as loginApi } from '@/services/api';

const STORAGE_KEY = 'coss_auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    if (res.success && res.user) {
      setUser(res.user);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      return { success: true };
    }
    return { success: false, message: res.message ?? '로그인에 실패했습니다.' };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
