'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken, getToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, code?: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; inviteCode?: string }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    if (!getToken()) { setLoading(false); return; }
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadMe(); }, []);

  // Presence heartbeat: cập nhật trạng thái online khi đã đăng nhập
  useEffect(() => {
    if (!user) return;
    const ping = () => api.post('/community/heartbeat').catch(() => {});
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [user]);

  async function login(email: string, password: string, code?: string) {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password, code });
    setToken(res.accessToken);
    setUser(res.user ?? (await api.get<User>('/auth/me')));
  }

  async function register(data: { username: string; email: string; password: string; inviteCode?: string }) {
    const payload = { ...data, inviteCode: data.inviteCode || undefined };
    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', payload);
    if (res.accessToken) { setToken(res.accessToken); setUser(res.user); }
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
