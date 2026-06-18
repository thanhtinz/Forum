'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Fish, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const FISH_BG = '/game-assets/cauca/nencauca.png';
const ZONE_BG = (z: number) => `/game-assets/cauca/khu${z}.png`;

interface FishState {
  coin: number;
  profile: { level: number; totalKg: number; nextLevelKg: number; totalCaught: number; ownedRods: number[]; bait: Record<string, number> };
  cast: { zone: number; biteReady: boolean } | null;
  zones: { zone: number; rodPrice: number; baitPrice: number; hasRod: boolean;
    species: { id: string; name: string; pricePerKg: number; stock: number; asset: string | null }[] }[];
}

export default function FishingPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FishState | null>(null);
  const [msg, setMsg] = useState('');

  function load() { api.get<FishState>('/fishing/state').then(setS).catch((e) => setMsg(e.message)); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để câu cá.</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const act = async (fn: () => Promise<any>) => { try { const r = await fn(); setMsg(r?.message || 'OK'); } catch (e: any) { setMsg(e.message); } load(); };

  return (
    <div className="space-y-5 rounded-2xl bg-cover bg-center p-1" style={{ backgroundImage: `linear-gradient(rgba(240,249,255,.6),rgba(240,249,255,.6)), url(${FISH_BG})` }}>
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Fish /> Câu cá</h1>
          <p className="text-white/90">Cấp {s.profile.level} · {s.profile.totalKg}/{s.profile.nextLevelKg}kg · đã câu {s.profile.totalCaught}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {s.coin.toLocaleString()}</div>
      </header>

      {msg && <div className="card p-3 text-center text-sm text-brand-600">{msg}</div>}

      {/* Hồ câu */}
      <div className="card overflow-hidden p-0">
        <img src="/game-assets/cauca/hoca.png" alt="Hồ câu" className="max-h-48 w-full object-contain bg-sky-100 dark:bg-ink-900" />
      </div>

      {s.cast && (
        <div className="card flex items-center justify-between p-4">
          <span>Đang thả cần ở khu {s.cast.zone} — {s.cast.biteReady ? 'cá đã cắn!' : 'đang chờ…'}</span>
          <button disabled={!s.cast.biteReady} onClick={() => act(() => api.post('/fishing/reel'))}
            className="btn-primary disabled:opacity-50">Giật cá</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {s.zones.map((z) => (
          <div key={z.zone} className="card overflow-hidden p-0">
            <div className="flex items-center justify-between bg-cover bg-center p-3" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)), url(${ZONE_BG(z.zone)})` }}>
              <h3 className="font-semibold text-white drop-shadow">Khu {z.zone}</h3>
              <span className="rounded bg-black/30 px-1.5 text-xs text-white">mồi: {s.profile.bait[z.zone] ?? 0}</span>
            </div>
            <div className="p-4 pt-2">
            {z.species.map((sp) => (
              <div key={sp.id} className="mt-2 flex items-center gap-2 text-sm">
                {sp.asset
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={sp.asset} alt={sp.name} className="h-8 w-8 object-contain" /> : null}
                <span className="flex-1">{sp.name}</span>
                <span className="text-ink-500">{sp.pricePerKg}/kg · còn {sp.stock}</span>
              </div>
            ))}
            <div className="mt-3 flex gap-2">
              {!z.hasRod
                ? <Link href="/game/shop?tab=fishing" className="btn-outline flex-1 !py-1.5 text-xs"><ShoppingBag size={12} /> Mua cần ở Cửa hàng</Link>
                : (s.profile.bait[z.zone] ?? 0) <= 0
                  ? <Link href="/game/shop?tab=fishing" className="btn-outline flex-1 !py-1.5 text-xs"><ShoppingBag size={12} /> Hết mồi — mua thêm</Link>
                  : <button disabled={!!s.cast} onClick={() => act(() => api.post('/fishing/cast', { zone: z.zone }))} className="btn-primary flex-1 !py-1.5 text-xs disabled:opacity-50">Thả cần</button>}
            </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => act(() => api.post('/fishing/sell-all'))} className="btn-outline">Bán toàn bộ cá</button>
      </div>
    </div>
  );
}
