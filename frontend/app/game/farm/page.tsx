'use client';

import { useEffect, useState } from 'react';
import { Coins, Sprout, Droplets } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { cropEmoji } from '@/lib/gameIcons';

const FARM_BG = '/game-assets/nongtrai/img/nennongtrai.png';
const GROUND = '/game-assets/nongtrai/img/product/dat.png';

// Ảnh cây theo 4 giai đoạn: gieohat (vừa gieo) -> non (cây con) -> uong (đang lớn) -> chin (chín)
const PRODUCT_BASE = '/game-assets/nongtrai/img/product';
function growthSrc(asset: string | null, ready: boolean, progress: number): string {
  if (!asset) return '';
  const m = asset.match(/\/sv1\/(\d+)\.png$/);
  if (!m) return asset;
  const id = m[1];
  if (ready) return `${PRODUCT_BASE}/${id}-chin.png`;
  if (progress < 0.3) return `${PRODUCT_BASE}/gieohat.png`;
  if (progress < 0.65) return `${PRODUCT_BASE}/${id}-non.png`;
  return `${PRODUCT_BASE}/${id}-uong.png`;
}

interface FarmState {
  coin: number;
  profile: { level: number; exp: number; plotCount: number; nextPlotPrice: number; kitchenLevel: number; dogActive: boolean; dogUntil?: string | null };
  plots: { index: number; slug: string | null; crop: string | null; asset: string | null; watered: boolean; tilled: boolean; health: number; ready: boolean; readyAt: string | null; progress?: number; empty: boolean }[];
  warehouse: { slug: string; name: string; category: string; quantity: number; unitSell: number; asset?: string | null }[];
  animals: { id: string; name: string; grown: boolean; productReady: boolean }[];
  fertilizers?: { slug: string; name: string; quantity: number; reduceSeconds: number }[];
  khe?: { fruit: number; max: number; pricePerFruit: number; canWater: boolean; nextWaterAt: string | null; nextFruitAt: string | null; fullAt: string | null };
}

export default function FarmPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FarmState | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [planting, setPlanting] = useState<number | null>(null);
  const [seedChoice, setSeedChoice] = useState('');
  const now = useNow();

  function load() { api.get<FarmState>('/farm/state').then(setS).catch((e) => setErr(e.message)); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào nông trại.</div>;
  if (err) return <div className="card p-8 text-center text-ink-500">{err}</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  async function buyPlot() { await api.post('/farm/plot/buy').catch(() => {}); load(); }
  async function buyDog() { try { await api.post('/farm/dog/buy'); setMsg('Đã mua chó giữ nhà (30 ngày)!'); } catch (e: any) { setMsg(e.message); } load(); }
  async function till(i: number) { try { await api.post('/farm/till', { plotIndex: i }); setMsg('Đã xới đất, giờ gieo hạt được rồi!'); } catch (e: any) { setMsg(e.message); } load(); }
  async function harvest(i: number) { await api.post('/farm/harvest', { plotIndex: i }).catch(() => {}); load(); }
  async function water(i: number) { await api.post('/farm/water', { plotIndex: i }).catch(() => {}); load(); }
  async function plant(plotIndex: number, cropSlug: string, name: string) {
    try { await api.post('/farm/plant', { plotIndex, cropSlug }); setMsg(`Đã gieo ${name}`); setPlanting(null); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function fertilize(plotIndex: number, fertilizerSlug: string, name: string) {
    try { await api.post('/farm/fertilize', { plotIndex, fertilizerSlug }); setMsg(`Đã bón ${name}`); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function waterKhe() { try { const r = await api.post<{ bonus: number }>('/farm/khe/water'); setMsg(`Đã tưới cây khế (+${r.bonus} quả)!`); } catch (e: any) { setMsg(e.message); } load(); }
  async function harvestKhe() { try { const r = await api.post<{ harvested: number }>('/farm/khe/harvest'); setMsg(`Đã thu hoạch ${r.harvested} quả khế vào kho. Vào kho để bán!`); } catch (e: any) { setMsg(e.message); } load(); }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Sprout /> Nông trại</h1>
          <p className="text-white/90">Cấp {s.profile.level} · {s.profile.plotCount} ô đất · <a href="/game/kitchen" className="underline hover:text-white">bếp Lv{s.profile.kitchenLevel}</a></p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {formatCoin(s.coin)}</div>
      </header>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Chó giữ nhà + Đi cướp */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card flex items-center gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/game-assets/nongtrai/img/dog.jpg" alt="Chó giữ nhà" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          {/* asset chuồng chó dùng chung khu nông trại */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Chó giữ nhà</p>
            {s.profile.dogActive
              ? <p className="text-xs text-emerald-600">Đang bảo vệ{s.profile.dogUntil ? ` · đến ${new Date(s.profile.dogUntil).toLocaleDateString('vi')}` : ''} — cắn kẻ trộm, mất tới 50% coin của chúng.</p>
              : <p className="text-xs text-ink-500">Nuôi chó để chống bị cướp cây/thú/cá. 20.000 coin / 30 ngày.</p>}
          </div>
          <button onClick={buyDog} className="btn-outline shrink-0 !py-1.5 text-xs">{s.profile.dogActive ? 'Gia hạn' : 'Mua chó'}</button>
        </div>
        <a href="/game/raid" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <span className="text-3xl">🥷</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Đi cướp nhà người khác</p>
            <p className="text-xs text-ink-500">Sang nông trại thành viên khác trộm cây chín (coi chừng chó!).</p>
          </div>
          <span className="btn-primary shrink-0 !py-1.5 text-xs">Đi cướp →</span>
        </a>
      </section>

      {/* Cây Khế — tự ra quả theo thời gian, tưới để thêm, có quả mới thu hoạch */}
      {s.khe && (() => {
        const ratio = Math.min(1, s.khe.fruit / s.khe.max);
        const ripe = s.khe.fruit >= s.khe.max;
        const status = s.khe.fruit <= 0 ? 'Chưa có quả — chờ cây ra quả' : ripe ? 'Sai trĩu quả — thu hoạch ngay!' : 'Đang ra quả…';
        return (
        <section className="card flex items-center gap-4 p-4">
          {/* Cây khế: có quả -> ảnh cây chín, chưa có quả -> ảnh cây xanh */}
          <div className="h-24 w-24 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/game-assets/nongtrai/img/${s.khe.fruit > 0 ? 'caykhechin' : 'caykhe'}.png`} alt="Cây khế"
              className={`h-24 w-24 object-contain transition-all ${s.khe.fruit <= 0 ? 'opacity-80' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Cây Khế</h2>
            <p className={`text-xs font-medium ${ripe ? 'text-amber-600' : s.khe.fruit <= 0 ? 'text-ink-400' : 'text-emerald-600'}`}>{status}</p>
            {/* thanh tiến độ ra quả */}
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="mt-1 text-sm text-ink-500">Quả: <b>{s.khe.fruit}</b>/{s.khe.max} · {s.khe.pricePerFruit} coin/quả. Tưới mỗi ngày để ra thêm quả.</p>
            {!ripe && s.khe.nextFruitAt && (
              <p className="text-xs text-emerald-600">⏳ Quả tiếp theo sau {formatDuration(secondsUntil(s.khe.nextFruitAt, now))}{s.khe.fullAt ? ` · đầy cây sau ${formatDuration(secondsUntil(s.khe.fullAt, now))}` : ''}</p>
            )}
            {!s.khe.canWater && s.khe.nextWaterAt && (
              <p className="text-xs text-ink-400">Tưới tiếp được sau: {new Date(s.khe.nextWaterAt).toLocaleString('vi')}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={harvestKhe} disabled={s.khe.fruit <= 0} className="btn-primary disabled:opacity-50">Thu hoạch ({s.khe.fruit})</button>
            <button onClick={waterKhe} disabled={!s.khe.canWater} className="btn-outline disabled:opacity-50">{s.khe.canWater ? 'Tưới cây' : 'Đã tưới'}</button>
          </div>
        </section>
        );
      })()}

      <section className="card overflow-hidden p-4 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.78),rgba(255,255,255,.78)), url(${FARM_BG})` }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Ô đất</h2>
          <button onClick={buyPlot} className="btn-primary !py-1.5 text-xs">+ Mua ô ({formatCoin(s.profile.nextPlotPrice)})</button>
        </div>
        {s.plots.length === 0 ? (
          <p className="text-sm text-ink-700">Chưa có ô đất. Mua ô đầu tiên để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {s.plots.map((p) => {
              const seeds = (s.warehouse || []).filter((w) => w.category === 'SEED' && w.quantity > 0);
              const ferts = s.fertilizers || [];
              const prog = p.progress ?? 0;
              return (
              <div key={p.index} className="rounded-xl border border-ink-200/70 bg-white/70 p-2 text-center">
                <div className={`relative grid h-16 place-items-center rounded-lg bg-cover bg-center ${p.empty && !p.tilled ? 'saturate-50 brightness-90' : ''}`} style={{ backgroundImage: `url(${GROUND})` }}>
                  {!p.empty && (p.asset
                    // cây lớn dần: ảnh sprite theo giai đoạn, nhỏ lúc mới trồng to khi sắp chín
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={growthSrc(p.asset, p.ready, prog)} alt="" onError={(e) => { if (p.asset) (e.currentTarget as HTMLImageElement).src = p.asset; }}
                        className="object-contain transition-all" style={{ maxHeight: `${40 + prog * 60}%` }} />
                    : <span className="leading-none transition-all" style={{ fontSize: `${14 + prog * 26}px` }}>{cropEmoji(p.slug || '')}</span>)}
                  {p.empty && <span className="text-[10px] text-ink-400">{p.tilled ? '+ Gieo' : 'Đất chưa xới'}</span>}
                </div>
                <div className="mt-1 truncate text-xs">{p.crop || 'Trống'}</div>
                {/* Thanh tiến độ lớn + đếm giờ */}
                {!p.empty && !p.ready && (
                  <>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded bg-ink-100 dark:bg-ink-800"><div className="h-full bg-emerald-400" style={{ width: `${prog * 100}%` }} /></div>
                    {p.readyAt && <div className="text-[10px] text-emerald-600">⏳ {formatDuration(secondsUntil(p.readyAt, now))}</div>}
                  </>
                )}
                {/* Ô trống chưa xới: phải xới trước */}
                {p.empty && !p.tilled && (
                  <button onClick={() => till(p.index)} className="mt-1 w-full rounded bg-amber-600 px-1 py-0.5 text-[10px] text-white">⛏ Xới đất</button>
                )}
                {/* Ô trống đã xới: chọn hạt để gieo */}
                {p.empty && p.tilled && planting !== p.index && (
                  <button onClick={() => { setPlanting(p.index); setSeedChoice(''); }} className="mt-1 w-full rounded bg-emerald-500 px-1 py-0.5 text-[10px] text-white">Gieo hạt</button>
                )}
                {p.empty && p.tilled && planting === p.index && (
                  <div className="mt-1 space-y-1">
                    {seeds.length === 0 ? <p className="text-[10px] text-ink-400">Chưa có hạt. Mua ở cửa hàng.</p> : (
                      <>
                        <select className="input !py-0.5 !text-[10px]" value={seedChoice} onChange={(e) => setSeedChoice(e.target.value)}>
                          <option value="">Chọn hạt…</option>
                          {seeds.map((sd) => <option key={sd.slug} value={sd.slug}>{cropEmoji(sd.slug.replace(/^seed_/, ''))} {sd.name} (×{sd.quantity})</option>)}
                        </select>
                        <button disabled={!seedChoice} onClick={() => { const sd = seeds.find((x) => x.slug === seedChoice); if (sd) plant(p.index, sd.slug.replace(/^seed_/, ''), sd.name); }}
                          className="w-full rounded bg-emerald-600 px-1 py-0.5 text-[10px] font-medium text-white disabled:opacity-50">Gieo</button>
                      </>
                    )}
                    <button onClick={() => setPlanting(null)} className="text-[10px] text-ink-400 underline">Hủy</button>
                  </div>
                )}
                {/* Cây đang trồng: tưới / bón / thu */}
                {!p.empty && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {p.ready ? (
                      <button onClick={() => harvest(p.index)} className="rounded bg-amber-500 px-2 py-0.5 text-[10px] text-white">Thu hoạch</button>
                    ) : (
                      <>
                        {!p.watered && <button onClick={() => water(p.index)} className="rounded bg-sky-500 px-2 py-0.5 text-[10px] text-white inline-flex items-center gap-0.5"><Droplets size={10} /> Tưới</button>}
                        {ferts.length > 0 && (
                          <select className="input !py-0.5 !text-[10px] !w-auto" defaultValue="" onChange={(e) => e.target.value && fertilize(p.index, e.target.value, e.target.options[e.target.selectedIndex].text)}>
                            <option value="" disabled>Bón…</option>
                            {ferts.map((f) => <option key={f.slug} value={f.slug}>{f.name} (×{f.quantity})</option>)}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </section>

      <a href="/game/kho" className="card flex items-center justify-between p-4 transition hover:shadow-lg">
        <span className="font-semibold">📦 Kho chung — xem & bán nông sản, sản phẩm, cá, món ăn</span>
        <span className="btn-outline !py-1.5 text-xs">Mở kho →</span>
      </a>
    </div>
  );
}
