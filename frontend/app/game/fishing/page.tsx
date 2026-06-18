'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Fish, ShoppingBag, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';

const SCENE_BG = '/game-assets/cauca/nencauca.png';
const ROD_LINE = '/game-assets/cauca/giangcau.gif';
const ZONE_NAME: Record<number, string> = { 1: 'Khu cá rô', 2: 'Khu cá lòng tong', 3: 'Khu cá mập' };

interface Species { id: string; name: string; pricePerKg: number; stock: number; asset: string | null }
interface FishState {
  coin: number;
  profile: { level: number; totalKg: number; nextLevelKg: number; totalCaught: number; ownedRods: number[]; bait: Record<string, number> };
  cast: { zone: number; biteAt: string | null; biteReady: boolean } | null;
  zones: { zone: number; rodPrice: number; baitPrice: number; hasRod: boolean; species: Species[] }[];
}
interface StoredFish { id: string; name: string; weightKg: number; value: number; asset: string | null }
interface PondData { capacity: number; count: number; maxMult: number; fishes: { id: string; name: string; asset: string | null; startKg: number; currentKg: number; value: number; matured: boolean }[] }

export default function FishingPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FishState | null>(null);
  const [store, setStore] = useState<StoredFish[]>([]);
  const [pond, setPond] = useState<PondData | null>(null);
  const [zone, setZone] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const now = useNow();

  function load() {
    api.get<FishState>('/fishing/state').then((st) => { setS(st); if (st.cast) setZone(st.cast.zone); }).catch((e) => setMsg(e.message));
    api.get<StoredFish[]>('/fishing/storage').then(setStore).catch(() => {});
    api.get<PondData>('/fishing/pond').then(setPond).catch(() => {});
  }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để câu cá.</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const act = async (fn: () => Promise<any>) => { try { const r = await fn(); if (r?.message) setMsg(r.message); else setMsg(''); } catch (e: any) { setMsg(e.message); } load(); };
  const casting = s.cast; // đang quăng cần (toàn cục, chỉ 1 lần)

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Fish /> Câu cá</h1>
          <p className="text-white/90">Cấp {s.profile.level} · {s.profile.totalKg}/{s.profile.nextLevelKg}kg · đã câu {s.profile.totalCaught}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {formatCoin(s.coin)}</div>
      </header>

      {msg && <div className="card p-3 text-center text-sm text-brand-600">{msg}</div>}

      {/* ───── Chọn khu (lobby) ───── */}
      {zone === null && (
        <>
          <div className="flex justify-end">
            <Link href="/game/shop?tab=fishing" className="btn-outline !py-1.5 text-xs"><ShoppingBag size={12} /> Cửa hàng dụng cụ</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {s.zones.map((z) => (
              <button key={z.zone} onClick={() => z.hasRod ? setZone(z.zone) : (window.location.href = '/game/shop?tab=fishing')}
                className="card overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex h-24 items-center justify-center bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)), url(${SCENE_BG})` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/game-assets/cauca/ve${z.zone}.png`} alt="" className="h-8 object-contain drop-shadow" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="p-3">
                  <p className="font-semibold">{ZONE_NAME[z.zone] || `Khu ${z.zone}`}</p>
                  <p className="text-xs text-ink-400">Mồi: {s.profile.bait[z.zone] ?? 0} · cá: {z.species.map((sp) => sp.name).join(', ')}</p>
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${z.hasRod ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>{z.hasRod ? 'Vào khu →' : 'Cần mua cần câu'}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ───── Trong khu: cảnh câu + quăng/giật ───── */}
      {zone !== null && (() => {
        const z = s.zones.find((x) => x.zone === zone)!;
        const here = casting && casting.zone === zone;
        const left = here && casting.biteAt ? secondsUntil(casting.biteAt, now) : 0;
        return (
          <div className="space-y-3">
            <button onClick={() => !casting && setZone(null)} disabled={!!casting} className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600 disabled:opacity-40"><ChevronLeft size={16} /> {casting ? 'Đang câu, không thể rời khu' : 'Khu khác'}</button>

            {/* Cảnh câu */}
            <div className="card relative overflow-hidden p-0">
              <div className="relative flex h-56 items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${SCENE_BG})` }}>
                <div className="absolute left-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-sm font-semibold text-white">{ZONE_NAME[zone]}</div>
                {/* dây câu khi đang quăng */}
                {here && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ROD_LINE} alt="" className={`h-32 object-contain transition-transform ${left <= 0 ? 'animate-bounce' : ''}`} />
                )}
                {here && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
                    {left > 0 ? `Đang chờ cá cắn… ${formatDuration(left)}` : '🎣 Cá cắn câu rồi — GIẬT ngay!'}
                  </div>
                )}
              </div>
              {/* Nút quăng / giật */}
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm text-ink-500">Mồi khu này: <b>{s.profile.bait[zone] ?? 0}</b></span>
                {!casting ? (
                  (s.profile.bait[zone] ?? 0) > 0
                    ? <button onClick={() => act(() => api.post('/fishing/cast', { zone }))} className="btn-primary">🎣 Quăng cần</button>
                    : <Link href="/game/shop?tab=fishing" className="btn-outline text-xs"><ShoppingBag size={12} /> Hết mồi — mua</Link>
                ) : here ? (
                  <button disabled={left > 0} onClick={() => act(() => api.post('/fishing/reel'))} className="btn-primary disabled:opacity-50">Giật cá!</button>
                ) : (
                  <span className="text-xs text-amber-600">Bạn đang câu ở {ZONE_NAME[casting!.zone]}</span>
                )}
              </div>
            </div>

            {/* Cá trong khu */}
            <div className="card p-3">
              <p className="mb-1 text-sm font-medium">Cá khu này</p>
              {z.species.map((sp) => (
                <div key={sp.id} className="mt-1 flex items-center gap-2 text-sm">
                  {sp.asset && <img src={sp.asset} alt={sp.name} className="h-7 w-7 object-contain" />}
                  <span className="flex-1">{sp.name}</span>
                  <span className="text-ink-500">{formatCoin(sp.pricePerKg)}/kg · còn {sp.stock}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Kho cá */}
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
        {store.length === 0 ? <p className="text-sm text-ink-500">Chưa có cá trong kho.</p> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {store.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                {f.asset && <img src={f.asset} alt={f.name} className="h-8 w-8 object-contain" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{f.name}</p><p className="text-xs text-ink-400">{f.weightKg}kg · {formatCoin(f.value)} coin</p></div>
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
          {/* Cảnh hồ (asset hoca.png) — cá thật bơi qua lại */}
          <div className="relative mb-2 h-32 overflow-hidden rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(/game-assets/cauca/hoca.png)`, backgroundColor: '#bae6fd' }}>
            {pond.fishes.slice(0, 14).map((f, i) => (
              f.asset
                // eslint-disable-next-line @next/next/no-img-element
                ? <img key={f.id} src={f.asset} alt={f.name} className="anim-swim object-contain" style={{ top: `${12 + (i % 4) * 20}%`, height: `${22 + Math.min(20, f.currentKg)}px`, animationDuration: `${8 + (i % 5) * 2.5}s`, animationDelay: `${-(i * 1.1)}s` }} />
                : <span key={f.id} className="anim-swim text-2xl" style={{ top: `${12 + (i % 4) * 20}%`, animationDuration: `${9 + (i % 4) * 2}s`, animationDelay: `${-(i * 1.1)}s` }}>🐟</span>
            ))}
            {pond.fishes.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm font-medium text-sky-900/80">Hồ trống — thả cá vào để nuôi</p>}
          </div>
          <p className="mb-2 text-xs text-ink-500">Cá lớn dần theo thời gian (tối đa x{pond.maxMult}) — nuôi lâu bán càng được giá.</p>
          {pond.fishes.length === 0 ? <p className="text-sm text-ink-500">Hồ trống. Thả cá từ kho vào để nuôi.</p> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pond.fishes.map((f) => (
                <div key={f.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${f.matured ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-ink-100 dark:border-ink-800'}`}>
                  {f.asset && <img src={f.asset} alt={f.name} className="h-8 w-8 object-contain" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name} {f.matured && <span className="text-emerald-600">• đã lớn tối đa</span>}</p>
                    <p className="text-xs text-ink-400">{f.startKg}kg → <b>{f.currentKg}kg</b> · {formatCoin(f.value)} coin</p>
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
