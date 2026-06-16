'use client';

import { useEffect, useState } from 'react';
import { Coins, Sprout, Droplets } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface FarmState {
  coin: number;
  profile: { level: number; exp: number; plotCount: number; nextPlotPrice: number; kitchenLevel: number; dogActive: boolean };
  plots: { index: number; crop: string | null; asset: string | null; watered: boolean; health: number; ready: boolean; empty: boolean }[];
  warehouse: { slug: string; name: string; category: string; quantity: number; unitSell: number }[];
  animals: { id: string; name: string; grown: boolean; productReady: boolean }[];
}

export default function FarmPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FarmState | null>(null);
  const [err, setErr] = useState('');

  function load() { api.get<FarmState>('/farm/state').then(setS).catch((e) => setErr(e.message)); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào nông trại.</div>;
  if (err) return <div className="card p-8 text-center text-ink-500">{err}</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  async function buyPlot() { await api.post('/farm/plot/buy').catch(() => {}); load(); }
  async function harvest(i: number) { await api.post('/farm/harvest', { plotIndex: i }).catch(() => {}); load(); }
  async function water(i: number) { await api.post('/farm/water', { plotIndex: i }).catch(() => {}); load(); }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Sprout /> Nông trại</h1>
          <p className="text-white/90">Cấp {s.profile.level} · {s.profile.plotCount} ô đất · bếp Lv{s.profile.kitchenLevel}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {s.coin.toLocaleString()}</div>
      </header>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Ô đất</h2>
          <button onClick={buyPlot} className="btn-primary !py-1.5 text-xs">+ Mua ô ({s.profile.nextPlotPrice.toLocaleString()})</button>
        </div>
        {s.plots.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có ô đất. Mua ô đầu tiên để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {s.plots.map((p) => (
              <div key={p.index} className="rounded-xl border border-ink-200/70 p-2 text-center dark:border-ink-800">
                <div className="grid h-16 place-items-center rounded-lg bg-ink-50 dark:bg-ink-900">
                  {p.asset
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.asset} alt="" className="max-h-12 object-contain" />
                    : <Sprout className="text-ink-300" />}
                </div>
                <div className="mt-1 truncate text-xs">{p.crop || 'Trống'}</div>
                {!p.empty && (
                  <div className="mt-1 flex justify-center gap-1">
                    {p.ready
                      ? <button onClick={() => harvest(p.index)} className="rounded bg-amber-500 px-2 py-0.5 text-[10px] text-white">Thu</button>
                      : !p.watered && <button onClick={() => water(p.index)} className="rounded bg-sky-500 px-2 py-0.5 text-[10px] text-white"><Droplets size={10} /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Kho ({s.warehouse.length})</h2>
          <ul className="space-y-1 text-sm">
            {s.warehouse.slice(0, 12).map((w) => (
              <li key={w.slug + w.category} className="flex justify-between border-b border-ink-100 py-1 dark:border-ink-800">
                <span>{w.name} <span className="text-ink-400">×{w.quantity}</span></span>
                <span className="text-ink-500">{w.unitSell ? `${w.unitSell}/cái` : '—'}</span>
              </li>
            ))}
            {s.warehouse.length === 0 && <li className="text-ink-500">Kho trống.</li>}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Vật nuôi ({s.animals.length})</h2>
          <ul className="space-y-1 text-sm">
            {s.animals.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-ink-100 py-1 dark:border-ink-800">
                <span>{a.name}</span>
                <span className="text-ink-500">{a.productReady ? 'Có sản phẩm' : a.grown ? 'Trưởng thành' : 'Đang lớn'}</span>
              </li>
            ))}
            {s.animals.length === 0 && <li className="text-ink-500">Chưa có vật nuôi.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
