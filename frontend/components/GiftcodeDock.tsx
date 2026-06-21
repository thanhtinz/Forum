'use client';

import { useState } from 'react';
import { Gift, X, Loader2, Check, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useDraggable } from '@/lib/useDraggable';

interface RewardOut { type: string; label: string }

export function GiftcodeDock() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rewards, setRewards] = useState<RewardOut[] | null>(null);
  // mặc định nằm ngay TRÊN trình phát nhạc (music ở bottom 72)
  const drag = useDraggable('giftcode', { right: 16, bottom: 128 });

  if (loading || !user) return null;

  async function redeem() {
    if (!code.trim()) return;
    setBusy(true); setErr(''); setRewards(null);
    try {
      const r = await api.post<{ rewards: RewardOut[] }>('/giftcode/redeem', { code: code.trim() });
      setRewards(r.rewards || []);
      setCode('');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      {!open && (
        <button onPointerDown={drag.onPointerDown} onClick={() => { if (drag.movedRef.current) return; setOpen(true); }}
          title="Nhập giftcode (giữ & kéo để di chuyển)"
          className={`z-40 grid h-11 w-11 cursor-grab place-items-center rounded-full bg-gradient-to-br from-amber-500 to-pink-600 text-white shadow-lg hover:from-amber-600 hover:to-pink-700 ${drag.dragging ? 'cursor-grabbing scale-105' : ''}`}
          style={drag.style}>
          <Gift size={20} />
        </button>
      )}

      {open && (
        <div data-drag-panel style={drag.panelStyle(320, 360)} className="fixed z-40 w-[320px] max-w-[92vw] rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
          <div onPointerDown={drag.panelPointerDown} style={{ touchAction: 'none' }} className="flex cursor-grab items-center justify-between border-b border-ink-200 px-4 py-2.5 select-none active:cursor-grabbing dark:border-ink-800">
            <span className="flex items-center gap-1.5 text-sm font-bold text-pink-600"><Gift size={16} /> Nhập Giftcode</span>
            <button onClick={() => { setOpen(false); setRewards(null); setErr(''); }} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={16} /></button>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-1.5">
              <input className="input flex-1 font-mono uppercase tracking-wider" placeholder="NHẬP MÃ…" value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && redeem()} maxLength={40} />
              <button onClick={redeem} disabled={busy || !code.trim()}
                className="grid w-11 shrink-0 place-items-center rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
              </button>
            </div>

            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30">{err}</p>}

            {rewards && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><Check size={15} /> Nhận quà thành công!</p>
                <ul className="mt-1.5 space-y-1">
                  {rewards.map((r, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-ink-700 dark:text-ink-200"><Gift size={13} className="text-pink-500" /> {r.label}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-center text-[11px] text-ink-400">Mỗi mã chỉ dùng được số lần giới hạn. Quà cộng thẳng vào tài khoản.</p>
          </div>
        </div>
      )}
    </>
  );
}
