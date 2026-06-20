'use client';

import { useState } from 'react';
import { ShieldAlert, X, Search, AlertTriangle, MicOff, Ban, Unlock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useDraggable } from '@/lib/useDraggable';

// Thanh kiểm duyệt nhanh cho admin/mod — nổi trên mọi trang client
export function AdminModBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const drag = useDraggable('admin-mod', { right: 16, bottom: 128 });
  const [username, setUsername] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [days, setDays] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) return null;
  const isAdmin = user.role === 'ADMIN';

  async function lookup() {
    setMsg(''); setInfo(null);
    if (!username.trim()) return;
    try { setInfo(await api.get<any>(`/mod/user/${encodeURIComponent(username.trim())}`)); }
    catch (e: any) { setMsg(e.message); }
  }
  async function act(fn: () => Promise<any>, ok: string) {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); await lookup(); }
    catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      {/* Nút nổi */}
      {!open && (
        <button onPointerDown={drag.onPointerDown} onClick={() => { if (drag.movedRef.current) return; setOpen(true); }} title="Kiểm duyệt nhanh (giữ & kéo để di chuyển)"
          className={`z-40 grid h-11 w-11 cursor-grab place-items-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-700 ${drag.dragging ? 'cursor-grabbing scale-105' : ''}`} style={drag.style}>
          <ShieldAlert size={20} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[330px] max-w-[92vw] rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-ink-800">
            <span className="flex items-center gap-1.5 text-sm font-bold text-rose-600"><ShieldAlert size={16} /> Kiểm duyệt</span>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={16} /></button>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex gap-1.5">
              <input className="input flex-1" placeholder="username" value={username}
                onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} />
              <button onClick={lookup} className="btn-outline px-2.5"><Search size={15} /></button>
            </div>

            {info && (
              <div className="rounded-lg bg-ink-50 p-2 text-xs dark:bg-ink-800/50">
                <div className="flex items-center gap-2">
                  <b>{info.displayName || info.username}</b>
                  <span className="chip bg-ink-200 text-ink-600 dark:bg-ink-700">{info.role}</span>
                  <span className={`chip ${info.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{info.status}</span>
                </div>
                <div className="mt-1 text-ink-500">Cảnh cáo: <b>{info.warnings}</b>{info.jailed ? ' · đang bị giam' : ''}{info.bannedUntil ? ` · khóa đến ${new Date(info.bannedUntil).toLocaleDateString('vi-VN')}` : ''}</div>
              </div>
            )}

            <textarea className="input min-h-[56px] text-sm" placeholder="Lý do…" value={reason} onChange={(e) => setReason(e.target.value)} />

            {/* Cảnh cáo */}
            <button disabled={busy || !username} onClick={() => act(() => api.post('/mod/warn', { username: username.trim(), reason }), 'Đã cảnh cáo')}
              className="btn-outline w-full justify-start text-amber-600"><AlertTriangle size={15} /> Cảnh cáo</button>

            {/* Mute */}
            <div className="flex gap-1.5">
              <input type="number" className="input w-24" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} title="phút" />
              <button disabled={busy || !username} onClick={() => act(() => api.post('/mod/mute', { username: username.trim(), minutes, reason }), 'Đã giam/mute')}
                className="btn-outline flex-1 justify-start text-sky-600"><MicOff size={15} /> Mute {minutes}′</button>
            </div>

            {isAdmin && (
              <>
                <div className="flex gap-1.5">
                  <input type="number" className="input w-24" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} title="số ngày (0 = vĩnh viễn)" />
                  <button disabled={busy || !username} onClick={() => act(() => api.post('/mod/ban', { username: username.trim(), reason, days }), 'Đã khóa tài khoản')}
                    className="btn-outline flex-1 justify-start text-rose-600"><Ban size={15} /> Ban {days > 0 ? `${days} ngày` : 'vĩnh viễn'}</button>
                </div>
                <button disabled={busy || !username} onClick={() => act(() => api.post('/mod/unban', { username: username.trim() }), 'Đã mở khóa')}
                  className="btn-outline w-full justify-start text-emerald-600"><Unlock size={15} /> Mở khóa</button>
              </>
            )}

            {msg && <p className="text-sm text-brand-600">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
