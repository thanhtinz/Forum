'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function GuildPage() {
  const { user, loading } = useAuth();
  const [guilds, setGuilds] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [msg, setMsg] = useState('');

  function load() { api.get<any>('/game/guilds').then((r) => setGuilds(r.data || r || [])).catch((e) => setMsg(e.message)); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); } load(); };
  async function view(id: string) { try { setDetail(await api.get(`/game/guilds/${id}`)); } catch {} }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào Guild.</div>;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-card">
        <Shield /> <h1 className="text-2xl font-bold">Bang hội</h1>
      </header>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Lập bang hội (5.000 coin)</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className="input" placeholder="Tên bang" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Tag (3-5 ký tự)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
          <button onClick={() => act(() => api.post('/game/guilds', form))} className="btn-primary">Lập bang</button>
        </div>
        <input className="input" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex gap-2">
          <button onClick={() => act(() => api.post('/game/guilds/donate', { amount: 1000 }))} className="btn-outline text-xs">Đóng góp 1000 coin</button>
          <button onClick={() => act(() => api.post('/game/guilds/leave'))} className="btn-outline text-xs text-red-600">Rời bang</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guilds.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">[{g.tag}] {g.name}</h3>
              <span className="text-xs text-ink-500">Lv{g.level ?? 1}</span>
            </div>
            <p className="mt-1 flex items-center gap-3 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Users size={12} /> {g.memberCount ?? g._count?.members ?? 0}</span>
              <span className="flex items-center gap-1"><Coins size={12} /> {g.fund ?? 0}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => view(g.id)} className="btn-outline flex-1 !py-1 text-xs">Xem</button>
              <button onClick={() => act(() => api.post(`/game/guilds/${g.id}/join`))} className="btn-primary flex-1 !py-1 text-xs">Gia nhập</button>
            </div>
          </div>
        ))}
        {guilds.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có bang hội nào.</p>}
      </div>

      {detail && (
        <div className="card p-5">
          <h2 className="font-semibold">[{detail.tag}] {detail.name} — Thành viên</h2>
          <p className="text-sm text-ink-500">{detail.description}</p>
          <div className="mt-2 space-y-1 text-sm">
            {(detail.members || []).map((m: any) => (
              <div key={m.id} className="flex justify-between border-b border-ink-100 py-1 dark:border-ink-800">
                <span>{m.character?.user?.username || m.characterId?.slice?.(0, 8) || '—'}</span>
                <span className="text-xs text-ink-400">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
