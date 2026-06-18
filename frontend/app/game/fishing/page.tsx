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

interface StoredFish { id: string; name: string; weightKg: number; value: number; asset: string | null }
interface PondData { capacity: number; count: number; maxMult: number; fishes: { id: string; name: string; asset: string | null; startKg: number; currentKg: number; value: number; matured: boolean }[] }

export default function FishingPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FishState | null>(null);
  const [store, setStore] = useState<StoredFish[]>([]);
  const [pond, setPond] = useState<PondData | null>(null);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<FishState>('/fishing/state').then(setS).catch((e) => setMsg(e.message));
    api.get<StoredFish[]>('/fishing/storage').then(setStore).catch(() => {});
    api.get<PondData>('/fishing/pond').then(setPond).catch(() => {});
  }
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

      {/* Kho cá vừa câu */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Kho cá ({store.length})</h2>
          {store.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => act(() => api.post('/fishing/pond/release-all'))} className="btn-outline !py-1.5 text-xs">Thả tất cả vào hồ</button>
              <button onClick={() => act(() => api.post('/fishing/sell-all'))} className="btn-primary !py-1.5 text-xs">Bán toàn bộ</button>
            </div>
          )}
        </div>
        {store.length === 0 ? <p className="text-sm text-ink-500">Chưa có cá trong kho. Hãy câu cá!</p> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {store.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                {f.asset && <img src={f.asset} alt={f.name} className="h-8 w-8 object-contain" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{f.name}</p><p className="text-xs text-ink-400">{f.weightKg}kg · {f.value.toLocaleString()} coin</p></div>
                <button onClick={() => act(() => api.post(`/fishing/pond/release/${f.id}`))} className="btn-outline shrink-0 !px-2 !py-1 text-xs">Thả hồ</button>
                <button onClick={() => act(() => api.post(`/fishing/sell/${f.id}`))} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Bán</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hồ nuôi cá */}
      {pond && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">🐟 Hồ nuôi cá ({pond.count}/{pond.capacity})</h2>
            {pond.fishes.length > 0 && (
              <button onClick={() => act(() => api.post('/fishing/pond/harvest-all'))} className="btn-primary !py-1.5 text-xs">Thu hoạch tất cả</button>
            )}
          </div>
          <p className="mb-2 text-xs text-ink-500">Cá trong hồ lớn dần theo thời gian (tối đa x{pond.maxMult} trọng lượng) — nuôi lâu bán càng được giá.</p>
          {pond.fishes.length === 0 ? <p className="text-sm text-ink-500">Hồ trống. Thả cá từ kho vào để nuôi.</p> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pond.fishes.map((f) => (
                <div key={f.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${f.matured ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-ink-100 dark:border-ink-800'}`}>
                  {f.asset && <img src={f.asset} alt={f.name} className="h-8 w-8 object-contain" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name} {f.matured && <span className="text-emerald-600">• đã lớn tối đa</span>}</p>
                    <p className="text-xs text-ink-400">{f.startKg}kg → <b>{f.currentKg}kg</b> · {f.value.toLocaleString()} coin</p>
                  </div>
                  <button onClick={() => act(() => api.post(`/fishing/pond/harvest/${f.id}`))} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Thu hoạch</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
