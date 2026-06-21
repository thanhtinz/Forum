'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Users, Coins, MessageSquare, Crown, UserMinus, ArrowUpDown, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const ROLE_LABEL: Record<string, string> = { LEADER: 'Chủ bang', CO_LEADER: 'Phó bang', ELDER: 'Trưởng lão', MEMBER: 'Thành viên' };
const RANK: Record<string, number> = { LEADER: 4, CO_LEADER: 3, ELDER: 2, MEMBER: 1 };

export default function GuildPage() {
  const { user, loading } = useAuth();
  const [guilds, setGuilds] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [myCharId, setMyCharId] = useState<string>('');
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [editDesc, setEditDesc] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => { api.get<any>('/game/guilds').then((r) => setGuilds(r.data || r || [])).catch((e) => setMsg(e.message)); }, []);
  useEffect(() => {
    if (loading || !user) return;
    load();
    api.get<{ id: string }>('/game/character').then((c) => setMyCharId(c.id)).catch(() => {});
  }, [user, loading, load]);

  const view = useCallback(async (id: string) => { try { const d = await api.get<any>(`/game/guilds/${id}`); setDetail(d); setEditDesc(d.description || ''); } catch {} }, []);
  const act = async (fn: () => Promise<any>, refreshId?: string) => {
    try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); }
    load(); if (refreshId) view(refreshId);
  };

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào Guild.</div>;

  const myMember = detail?.members?.find((m: any) => m.characterId === myCharId);
  const myRole = myMember?.role as string | undefined;
  const isLeader = myRole === 'LEADER';
  const canManage = myRole === 'LEADER' || myRole === 'CO_LEADER';

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <div className="flex items-center gap-2"><Shield /> <h1 className="text-2xl font-bold">Bang hội</h1></div>
        {myMember && <Link href="/chat" className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"><MessageSquare size={15} /> Chat bang hội</Link>}
      </header>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {!myMember && (
        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Lập bang hội (5.000 coin)</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input className="input" placeholder="Tên bang" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Tag (3-5 ký tự)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
            <button onClick={() => act(() => api.post('/game/guilds', form))} className="btn-primary">Lập bang</button>
          </div>
          <input className="input" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      )}

      {myMember && (
        <div className="card flex flex-wrap gap-2 p-4">
          <span className="mr-auto self-center text-sm text-ink-500">Bạn đang ở bang — vai trò: <b>{ROLE_LABEL[myRole!]}</b></span>
          <button onClick={() => act(() => api.post('/game/guilds/donate', { amount: 1000 }))} className="btn-outline text-xs"><Coins size={13} /> Đóng góp 1000</button>
          {!isLeader && <button onClick={() => act(() => api.post('/game/guilds/leave'))} className="btn-outline text-xs text-red-600">Rời bang</button>}
          {isLeader && <button onClick={() => confirm('Giải tán bang hội?') && act(() => api.post('/game/guilds/disband'))} className="btn-outline text-xs text-red-600"><Trash2 size={13} /> Giải tán</button>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guilds.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">[{g.tag}] {g.name}</h3>
              <span className="text-xs text-ink-500">Lv{g.level ?? 1}</span>
            </div>
            <p className="mt-1 flex items-center gap-3 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Users size={12} /> {g.memberCount ?? g._count?.members ?? 0}</span>
              <span className="flex items-center gap-1"><Coins size={12} /> {g.coinFund ?? g.fund ?? 0}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => view(g.id)} className="btn-outline flex-1 !py-1 text-xs">Xem</button>
              {!myMember && <button onClick={() => act(() => api.post(`/game/guilds/${g.id}/join`))} className="btn-primary flex-1 !py-1 text-xs">Gia nhập</button>}
            </div>
          </div>
        ))}
        {guilds.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có bang hội nào.</p>}
      </div>

      {detail && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">[{detail.tag}] {detail.name} · Lv{detail.level ?? 1}</h2>
            <span className="text-xs text-ink-500">Quỹ: {(detail.coinFund ?? 0).toLocaleString()} coin</span>
          </div>

          {/* Sửa mô tả (chủ/phó) */}
          {canManage && detail.id === myMember?.guildId ? (
            <div className="flex gap-2">
              <input className="input flex-1" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Mô tả bang hội" />
              <button onClick={() => act(() => api.post('/game/guilds/update', { description: editDesc }), detail.id)} className="btn-outline text-xs">Lưu mô tả</button>
            </div>
          ) : (
            <p className="text-sm text-ink-500">{detail.description || 'Chưa có mô tả.'}</p>
          )}

          <div className="space-y-1 text-sm">
            {(detail.members || []).map((m: any) => {
              const isMe = m.characterId === myCharId;
              const inMyGuild = detail.id === myMember?.guildId;
              const canActOn = inMyGuild && !isMe && canManage && RANK[myRole!] > RANK[m.role];
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 border-b border-ink-100 py-1.5 dark:border-ink-800">
                  <span className="flex items-center gap-1.5">
                    {m.role === 'LEADER' && <Crown size={13} className="text-amber-500" />}
                    {m.character?.user?.username || m.characterId?.slice?.(0, 8) || '—'}{isMe && ' (bạn)'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">{ROLE_LABEL[m.role] || m.role}</span>
                    {canActOn && (
                      <>
                        {isLeader && (
                          <select className="rounded border border-ink-300 bg-transparent px-1 py-0.5 text-xs dark:border-ink-700"
                            value="" onChange={(e) => e.target.value && act(() => api.post(`/game/guilds/members/${m.id}/role`, { role: e.target.value }), detail.id)}>
                            <option value="">Đặt cấp…</option>
                            <option value="CO_LEADER">Phó bang</option>
                            <option value="ELDER">Trưởng lão</option>
                            <option value="MEMBER">Thành viên</option>
                          </select>
                        )}
                        {isLeader && <button title="Chuyển quyền chủ" onClick={() => confirm('Chuyển quyền chủ bang cho thành viên này?') && act(() => api.post(`/game/guilds/members/${m.id}/transfer`), detail.id)} className="text-amber-600 hover:text-amber-700"><ArrowUpDown size={14} /></button>}
                        <button title="Đuổi" onClick={() => confirm('Đuổi thành viên này?') && act(() => api.post(`/game/guilds/members/${m.id}/kick`), detail.id)} className="text-red-500 hover:text-red-600"><UserMinus size={14} /></button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
