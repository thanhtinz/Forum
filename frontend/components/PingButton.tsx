'use client';

import { useEffect, useState } from 'react';
import { AtSign, X, Search, Loader2, Check, Users, Wifi, UserPlus, Globe2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

type Scope = 'all' | 'online' | 'followers' | 'users';
interface Member { id: string; username: string; displayName?: string | null; avatar?: string | null }

// Nút "Ping" — nhắc người khác vào bài viết / phòng chat. `link` là đường dẫn sẽ mở khi bấm thông báo.
export function PingButton({ link, defaultTitle, label = 'Ping', className = '' }: { link: string; defaultTitle?: string; label?: string; className?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('users');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [picked, setPicked] = useState<Member[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (scope !== 'users' || !q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ data: Member[] }>(`/social/members?q=${encodeURIComponent(q.trim())}&limit=8`);
        setResults((r.data || []).filter((m) => m.id !== user?.id));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, scope, user?.id]);

  function reset() { setScope('users'); setQ(''); setResults([]); setPicked([]); setNote(''); setMsg(''); }

  async function submit() {
    setBusy(true); setMsg('');
    try {
      const r = await api.post<{ sent: number }>('/ping', {
        scope, link, title: defaultTitle, body: note.trim() || undefined,
        userIds: scope === 'users' ? picked.map((p) => p.id) : undefined,
      });
      setMsg(`Đã ping ${r.sent} người ✓`);
      setTimeout(() => { setOpen(false); reset(); }, 1200);
    } catch (e: any) { setMsg(e.message || 'Ping thất bại'); } finally { setBusy(false); }
  }

  if (!user) return null;
  const SCOPES: { key: Scope; label: string; icon: any; admin?: boolean }[] = [
    { key: 'users', label: 'Người cụ thể', icon: UserPlus },
    { key: 'followers', label: 'Người theo dõi tôi', icon: Users },
    { key: 'online', label: 'Đang online', icon: Wifi, admin: true },
    { key: 'all', label: 'Tất cả', icon: Globe2, admin: true },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'inline-flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-medium hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700'}>
        <AtSign size={15} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-lg font-bold"><AtSign size={18} /> Ping vào bài</h2>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            {/* Chọn phạm vi */}
            <div className="grid grid-cols-2 gap-2">
              {SCOPES.filter((s) => !s.admin || isAdmin).map((s) => (
                <button key={s.key} onClick={() => setScope(s.key)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${scope === s.key ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700'}`}>
                  <s.icon size={16} /> {s.label}
                </button>
              ))}
            </div>

            {/* Chọn người cụ thể */}
            {scope === 'users' && (
              <div className="mt-3 space-y-2">
                {picked.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {picked.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {p.displayName || p.username}
                        <button onClick={() => setPicked((l) => l.filter((x) => x.id !== p.id))}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm người dùng…" className="input w-full pl-9" />
                </div>
                {results.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-ink-200 dark:border-ink-700">
                    {results.map((m) => {
                      const on = picked.some((p) => p.id === m.id);
                      return (
                        <button key={m.id} onClick={() => setPicked((l) => on ? l.filter((x) => x.id !== m.id) : [...l, m])}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                          <span>{m.displayName || m.username} <span className="text-ink-400">@{m.username}</span></span>
                          {on && <Check size={15} className="text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {scope === 'all' && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Ping toàn bộ thành viên (chỉ thông báo trên app + push). Dùng cẩn thận.</p>}
            {scope === 'online' && <p className="mt-3 text-xs text-ink-500">Ping những người đang online (trong 5 phút gần đây).</p>}
            {scope === 'followers' && <p className="mt-3 text-xs text-ink-500">Ping những người đang theo dõi bạn (kèm email).</p>}

            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời nhắn (tuỳ chọn)…" className="input mt-3 min-h-[56px] w-full" />

            {msg && <p className="mt-2 text-sm text-brand-600">{msg}</p>}
            <button onClick={submit} disabled={busy || (scope === 'users' && picked.length === 0)}
              className="btn-primary mt-3 w-full disabled:opacity-50">
              {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Gửi ping'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
