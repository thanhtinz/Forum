'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mutate } from 'swr';
import { Fish, ChevronLeft, Ship, Anchor, Lock, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';

const SCENE_BG = '/game-assets/cauca/nencauca.png';
const ROD_LINE = '/game-assets/cauca/giangcau.gif';

interface DepthSpecies { name: string; kgMin: number; kgMax: number; pricePerKg: number; asset: string | null; stock: number }
interface Depth { depth: number; name: string; minRodTier: number; catchRate: number; canFish: boolean; needBoat: boolean; needRodTier: number; species: DepthSpecies[] }
interface Rod { slug: string; name: string; tier: number; price: number; asset: string | null; owned: boolean }
interface Boat { slug: string; name: string; price: number; capacity: number; maxDepth: number; asset: string | null; owned: boolean }
interface FishState {
  coin: number;
  profile: { level: number; totalKg: number; nextLevelKg: number; totalCaught: number; rodTier: number; bait: number; boatSlug: string | null; boat: { slug: string; name: string; capacity: number; maxDepth: number; asset: string | null } | null };
  cast: { depth: number; biteAt: string | null; biteReady: boolean } | null;
  depths: Depth[];
  rods: Rod[];
  boats: Boat[];
  boatHold: { capacity: number; count: number };
}
interface HoldFish { id: string; name: string; weightKg: number; value: number; asset: string | null }
interface Hold { capacity: number; count: number; fishes: HoldFish[] }

export default function FishingPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FishState | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [depth, setDepth] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const now = useNow();

  function load() {
    api.get<FishState>('/fishing/state').then((st) => { setS(st); if (st.cast) setDepth(st.cast.depth); }).catch((e) => setMsg(e.message));
    api.get<Hold>('/fishing/boat-hold').then(setHold).catch(() => {});
    mutate('/game/character');
  }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để câu cá.</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const act = async (fn: () => Promise<any>) => { try { const r = await fn(); if (r?.message) setMsg(r.message); else setMsg(''); } catch (e: any) { setMsg(e.message); } load(); };
  const casting = s.cast;
  const boat = s.profile.boat;

  return (
    <div className="space-y-5">
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</Link>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 p-6 text-white shadow-card">
        <Fish />
        <div>
          <h1 className="text-2xl font-bold">Câu cá</h1>
          <p className="text-sm text-white/90">Cấp {s.profile.level} · {s.profile.totalKg}/{s.profile.nextLevelKg}kg · đã câu {s.profile.totalCaught} · cần bậc {s.profile.rodTier || '—'}</p>
        </div>
      </header>

      {msg && <div className="card p-3 text-center text-sm text-brand-600">{msg}</div>}

      {/* ───── Trạng thái dụng cụ (mua ở Cửa hàng → tab Câu cá) ───── */}
      <div className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><Ship size={14} className="text-sky-500" /> {boat ? `${boat.name} (chứa ${s.boatHold.count}/${boat.capacity}, sâu ≤ ${boat.maxDepth})` : 'Chưa có thuyền'}</span>
          <span className="inline-flex items-center gap-1"><Anchor size={14} className="text-emerald-500" /> Cần bậc {s.profile.rodTier || '—'}</span>
          <span className="inline-flex items-center gap-1">🪱 Mồi: <b>{s.profile.bait}</b></span>
        </div>
        <Link href="/game/shop?tab=fishing" className="btn-outline !py-1.5 text-xs"><ShoppingBag size={12} /> Mua thuyền/cần/mồi</Link>
      </div>

      {!boat && (
        <div className="card border-amber-300 p-4 text-center">
          <Ship className="mx-auto text-sky-500" size={28} />
          <p className="mt-1 font-semibold">Bạn cần mua thuyền để ra hồ câu cá</p>
          <p className="text-xs text-ink-500">Vào <Link href="/game/shop?tab=fishing" className="text-brand-600 hover:underline">Cửa hàng → Câu cá</Link> để mua thuyền, cần câu và mồi.</p>
        </div>
      )}

      {/* ───── Chọn độ sâu (khi có thuyền) ───── */}
      {boat && depth === null && (
        <section className="space-y-2">
          <h2 className="font-semibold">Chọn độ sâu để câu</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {s.depths.map((d) => (
              <button key={d.depth} disabled={!d.canFish} onClick={() => d.canFish && setDepth(d.depth)}
                className={`card overflow-hidden p-0 text-left transition ${d.canFish ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-70'}`}>
                <div className="flex h-20 items-center justify-center bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(2,40,70,${0.15 + d.depth * 0.12}),rgba(2,40,70,${0.2 + d.depth * 0.15})), url(${SCENE_BG})` }}>
                  <span className="text-lg font-bold text-white drop-shadow">{d.name}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-ink-500">Tỷ lệ bắt {d.catchRate}% · cần bậc {d.minRodTier}+</p>
                  <p className="truncate text-xs text-ink-400">Cá: {d.species.map((sp) => sp.name).join(', ') || '—'}</p>
                  {d.canFish
                    ? <span className="mt-1 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">Ra câu →</span>
                    : <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><Lock size={10} /> {d.needBoat ? 'Cần thuyền sâu hơn' : `Cần cần bậc ${d.needRodTier}`}</span>}
                </div>
              </button>
            ))}
            {s.depths.length === 0 && <p className="text-sm text-ink-400">Admin chưa cấu hình độ sâu.</p>}
          </div>
        </section>
      )}

      {/* ───── Trong độ sâu: cảnh câu + quăng/giật ───── */}
      {boat && depth !== null && (() => {
        const d = s.depths.find((x) => x.depth === depth)!;
        const here = casting && casting.depth === depth;
        const left = here && casting.biteAt ? secondsUntil(casting.biteAt, now) : 0;
        const full = s.boatHold.count >= (boat.capacity || 0);
        return (
          <div className="space-y-3">
            <button onClick={() => !casting && setDepth(null)} disabled={!!casting} className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600 disabled:opacity-40"><ChevronLeft size={16} /> {casting ? 'Đang câu…' : 'Đổi độ sâu'}</button>
            <div className="card relative overflow-hidden p-0">
              <div className="relative flex h-56 items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${SCENE_BG})` }}>
                <div className="absolute left-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-sm font-semibold text-white">{d?.name} · khoang {s.boatHold.count}/{boat.capacity}</div>
                {here && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ROD_LINE} alt="" className={`h-32 object-contain ${left <= 0 ? 'animate-bounce' : ''}`} />
                )}
                {here && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
                    {left > 0 ? `Đang chờ cá cắn… ${formatDuration(left)}` : '🎣 Cá cắn câu — GIẬT ngay!'}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm text-ink-500">Tỷ lệ bắt: <b>{d?.catchRate}%</b></span>
                {full && !casting
                  ? <Link href="#hold" className="btn-outline text-xs">Khoang đầy — chuyển về kho/bán</Link>
                  : !casting && s.profile.bait <= 0
                    ? <Link href="/game/shop?tab=fishing" className="btn-outline text-xs"><ShoppingBag size={12} /> Hết mồi — mua</Link>
                    : !casting
                      ? <button onClick={() => act(() => api.post('/fishing/cast', { depth }))} className="btn-primary">🎣 Quăng cần</button>
                      : here
                        ? <button disabled={left > 0} onClick={() => act(() => api.post('/fishing/reel'))} className="btn-primary disabled:opacity-50">Giật cá!</button>
                        : <span className="text-xs text-amber-600">Đang câu ở độ sâu khác</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───── Khoang thuyền (thay cho block kho cũ) ───── */}
      {hold && (
        <div id="hold" className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-semibold"><Ship size={16} /> Khoang thuyền ({hold.count}/{hold.capacity})</h2>
            {hold.fishes.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => act(() => api.post('/fishing/boat/to-kho', {}))} className="btn-outline !py-1.5 text-xs">Chuyển hết về kho</button>
                <button onClick={() => act(() => api.post('/fishing/boat/sell-all'))} className="btn-primary !py-1.5 text-xs">Bán toàn bộ</button>
              </div>
            )}
          </div>
          {hold.fishes.length === 0 ? <p className="text-sm text-ink-500">Khoang trống — câu cá để chứa vào đây. Cá đầy thì chuyển về kho hoặc bán.</p> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hold.fishes.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                  {f.asset && <img src={f.asset} alt={f.name} className="h-8 w-8 object-contain" />}
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{f.name}</p><p className="text-xs text-ink-400">{f.weightKg}kg · {formatCoin(f.value)} coin</p></div>
                  <button onClick={() => act(() => api.post('/fishing/boat/to-kho', { id: f.id }))} className="btn-outline shrink-0 !px-2 !py-1 text-xs">Về kho</button>
                  <button onClick={() => act(() => api.post(`/fishing/sell/${f.id}`))} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Bán</button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-400">Cá chuyển về kho xem & bán ở <Link href="/game/kho" className="text-brand-600 hover:underline">Kho chung</Link>.</p>
        </div>
      )}
    </div>
  );
}
