'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, Swords } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { cropEmoji } from '@/lib/gameIcons';

interface RaidPlot { index: number; crop: string | null; slug: string | null; ready: boolean; empty: boolean }
interface RaidFarm { username: string; displayName?: string | null; dogActive: boolean; plots: RaidPlot[] }

export default function RaidPage() {
  const { user, loading } = useAuth();
  const [q, setQ] = useState('');
  const [farm, setFarm] = useState<RaidFarm | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để đi cướp.</div>;

  async function find() {
    if (!q.trim()) return;
    setMsg(''); setFarm(null); setBusy(true);
    try { setFarm(await api.get<RaidFarm>(`/farm/raid/${encodeURIComponent(q.trim())}`)); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function steal(plotIndex: number) {
    if (!farm) return;
    setMsg('');
    try {
      const r = await api.post<{ success?: boolean; message?: string; stolen?: number }>('/farm/steal', { username: farm.username, plotIndex });
      setMsg(r.message || (r.success ? `Trộm thành công ${r.stolen ?? ''}!` : 'Trộm hụt!'));
      setFarm(await api.get<RaidFarm>(`/farm/raid/${encodeURIComponent(farm.username)}`));
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-4">
      <Link href="/game/farm" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Nông trại</Link>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <Swords /> <h1 className="text-2xl font-bold">Đi cướp nông trại</h1>
      </header>
      <p className="text-sm text-ink-500">Nhập tên thành viên để sang trộm cây đã chín (tốn 200 EXP nông trại/lần). Nếu nhà họ có chó, bạn có thể bị cắn mất coin!</p>

      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Tên đăng nhập của nạn nhân…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} />
        <button onClick={find} disabled={busy} className="btn-primary inline-flex items-center gap-1"><Search size={16} /> Tìm</button>
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {farm && (
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Nông trại của {farm.displayName || farm.username}</h2>
            {farm.dogActive && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">🐕 Có chó giữ nhà</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {farm.plots.filter((p) => !p.empty).map((p) => (
              <div key={p.index} className={`rounded-xl border p-2 text-center ${p.ready ? 'border-emerald-300' : 'border-ink-200/70 opacity-60'}`}>
                <div className="text-2xl">{cropEmoji(p.slug || '')}</div>
                <div className="truncate text-xs">{p.crop}</div>
                {p.ready
                  ? <button onClick={() => steal(p.index)} className="mt-1 w-full rounded bg-rose-500 px-1 py-0.5 text-[10px] text-white">Trộm</button>
                  : <div className="mt-1 text-[10px] text-ink-400">Chưa chín</div>}
              </div>
            ))}
            {farm.plots.filter((p) => !p.empty).length === 0 && <p className="col-span-full text-sm text-ink-500">Nông trại trống, không có gì để trộm.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
