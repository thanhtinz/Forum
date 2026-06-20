'use client';

import { useEffect, useState } from 'react';
import { mutate } from 'swr';
import { ChevronLeft, Sprout } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { cropEmoji } from '@/lib/gameIcons';
import { cropStage, cropFruit } from '@/lib/cropSprites';
import DogCompanion from '@/components/DogCompanion';

const FARM_BG = '/game-assets/nongtrai/img/nennongtrai.png';
const SOIL_TILLED = '/game-assets/nongtrai/img/product/dat.png';      // đất đã xới
const SOIL_UNTILLED = '/game-assets/nongtrai/img/product/chuaxoi.png'; // đất chưa xới

interface FarmState {
  coin: number;
  profile: { level: number; exp: number; maxLevel: number; expIntoLevel: number; expForNextLevel: number | null; plotCount: number; maxPlots: number; nextPlotLevel: number | null; dogActive: boolean; dogUntil?: string | null };
  plots: { index: number; slug: string | null; crop: string | null; asset: string | null; watered: boolean; tilled: boolean; health: number; ready: boolean; readyAt: string | null; progress?: number; empty: boolean }[];
  warehouse: { slug: string; name: string; category: string; quantity: number; unitSell: number; asset?: string | null }[];
  animals: { id: string; name: string; grown: boolean; productReady: boolean }[];
  fertilizers?: { slug: string; name: string; quantity: number; reduceSeconds: number }[];
  khe?: { fruit: number; max: number; pricePerFruit: number; canWater: boolean; nextWaterAt: string | null; nextFruitAt: string | null; fullAt: string | null };
  well?: { water: number; max: number; costPlot: number; costKhe: number; nextDropAt: string | null; fullAt: string | null };
}

export default function FarmPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<FarmState | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [planting, setPlanting] = useState<number | null>(null);
  const [seedChoice, setSeedChoice] = useState('');
  const [fertPlot, setFertPlot] = useState<number | null>(null);
  const now = useNow();

  function load() { api.get<FarmState>('/farm/state').then(setS).catch((e) => setErr(e.message)); mutate('/game/character'); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào nông trại.</div>;
  if (err) return <div className="card p-8 text-center text-ink-500">{err}</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  async function buyDog() { try { await api.post('/farm/dog/buy'); setMsg('Đã mua chó giữ nhà (30 ngày)!'); } catch (e: any) { setMsg(e.message); } load(); }
  async function till(i: number) { try { await api.post('/farm/till', { plotIndex: i }); setMsg('Đã xới đất, giờ gieo hạt được rồi!'); } catch (e: any) { setMsg(e.message); } load(); }
  async function harvest(i: number) { await api.post('/farm/harvest', { plotIndex: i }).catch(() => {}); load(); }
  async function water(i: number) { try { await api.post('/farm/water', { plotIndex: i }); setMsg('Đã tưới nước (rút từ giếng).'); } catch (e: any) { setMsg(e.message); } load(); }
  async function plant(plotIndex: number, cropSlug: string, name: string) {
    try { await api.post('/farm/plant', { plotIndex, cropSlug }); setMsg(`Đã gieo ${name}`); setPlanting(null); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function fertilize(plotIndex: number, fertilizerSlug: string, name: string) {
    try { await api.post('/farm/fertilize', { plotIndex, fertilizerSlug }); setMsg(`Đã bón ${name}`); }
    catch (e: any) { setMsg(e.message); } load();
  }
  // Bấm vào ô đất -> hành động theo trạng thái
  function onPlotTap(p: FarmState['plots'][number]) {
    setMsg('');
    if (p.empty && !p.tilled) { till(p.index); return; }
    if (p.empty && p.tilled) { setSeedChoice(''); setPlanting(p.index); return; }   // mở chọn hạt
    if (!p.empty && p.ready) { harvest(p.index); return; }
    if (!p.empty) { setFertPlot(p.index); return; }   // cây đang lớn -> mở chăm sóc (tưới / bón phân)
  }
  async function waterKhe() { try { const r = await api.post<{ bonus: number }>('/farm/khe/water'); setMsg(`Đã tưới cây khế (+${r.bonus} quả)!`); } catch (e: any) { setMsg(e.message); } load(); }
  async function harvestKhe() { try { const r = await api.post<{ harvested: number }>('/farm/khe/harvest'); setMsg(`Đã thu hoạch ${r.harvested} quả khế vào kho. Vào kho để bán!`); } catch (e: any) { setMsg(e.message); } load(); }

  return (
    <div className="space-y-5">
      <a href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</a>
      <header className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 p-6 text-white shadow-card">
        <div className="flex items-center gap-2">
          <Sprout />
          <div>
            <h1 className="text-2xl font-bold">Nông trại</h1>
            <p className="text-sm text-white/90">Cấp {s.profile.level}/{s.profile.maxLevel} · {s.profile.plotCount}/{s.profile.maxPlots} ô đất</p>
          </div>
        </div>
        {/* Thanh EXP nông trại */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-white/90">
            <span>EXP nông trại</span>
            <span>{s.profile.expForNextLevel != null ? `${s.profile.expIntoLevel}/${s.profile.expForNextLevel} → cấp ${s.profile.level + 1}` : 'Đã đạt cấp tối đa'}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${s.profile.expForNextLevel ? Math.min(100, (s.profile.expIntoLevel / s.profile.expForNextLevel) * 100) : 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-white/80">
            {s.profile.nextPlotLevel != null ? `🔓 Lên cấp ${s.profile.nextPlotLevel} để mở thêm 1 ô đất (tối đa ${s.profile.maxPlots} ô).` : `Đã mở tối đa ${s.profile.maxPlots} ô đất.`}
          </p>
        </div>
      </header>

      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Chó giữ nhà + Đi cướp */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-12 w-16 shrink-0 place-items-center"><span className="dogspr dog-sit" /></span>
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

      {/* Giếng nước — nguồn nước CÓ HẠN, tự hồi theo thời gian. Mực nước dâng/cạn theo lượng còn lại. */}
      {s.well && (() => {
        const ratio = Math.min(1, s.well.water / s.well.max);
        const empty = s.well.water <= 0;
        const full = s.well.water >= s.well.max;
        const status = empty ? 'Giếng đã cạn — chờ nước hồi lại' : full ? 'Giếng đầy nước' : 'Nước đang hồi…';
        return (
        <section className="card flex items-center gap-4 p-4">
          {/* Giếng vẽ bằng CSS: thân giếng đá + mặt nước dâng theo mực nước (chưa có asset giếng trong nguồn) */}
          <div className="relative h-24 w-20 shrink-0">
            {/* mái giếng */}
            <div className="absolute -top-1 left-1/2 z-10 h-2 w-24 -translate-x-1/2 rounded-full bg-amber-900/80 shadow" />
            <div className="absolute top-0 left-1/2 z-0 h-3 w-1.5 -translate-x-[14px] bg-amber-800" />
            <div className="absolute top-0 left-1/2 z-0 h-3 w-1.5 translate-x-[12px] bg-amber-800" />
            {/* thân giếng (miệng giếng) */}
            <div className="absolute bottom-0 left-1/2 h-20 w-20 -translate-x-1/2 overflow-hidden rounded-b-md rounded-t-2xl border-4 border-stone-500 bg-stone-300 shadow-inner dark:border-stone-700 dark:bg-stone-800">
              {/* gạch đá */}
              <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(0deg,transparent,transparent_8px,rgba(0,0,0,.25)_9px),repeating-linear-gradient(90deg,transparent,transparent_12px,rgba(0,0,0,.25)_13px)]" />
              {/* lòng giếng tối */}
              <div className="absolute inset-x-1 bottom-1 top-2 overflow-hidden rounded-b-sm rounded-t-xl bg-stone-900/70">
                {/* mặt nước dâng theo mực nước */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-sky-400/90 to-sky-600 transition-[height] duration-700"
                  style={{ height: `${ratio * 100}%` }}>
                  <div className="h-1 w-full animate-pulse bg-white/40" />
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Giếng nước</h2>
            <p className={`text-xs font-medium ${empty ? 'text-rose-500' : full ? 'text-sky-600' : 'text-emerald-600'}`}>{status}</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="mt-1 text-sm text-ink-500">Nước: <b>{s.well.water}</b>/{s.well.max} · tưới ô đất tốn {s.well.costPlot}, tưới khế tốn {s.well.costKhe}. Nước tự hồi theo thời gian — <b>không vô hạn</b>.</p>
            {!full && s.well.nextDropAt && (
              <p className="text-xs text-sky-600">⏳ +1 nước sau {formatDuration(secondsUntil(s.well.nextDropAt, now))}{s.well.fullAt ? ` · đầy giếng sau ${formatDuration(secondsUntil(s.well.fullAt, now))}` : ''}</p>
            )}
          </div>
        </section>
        );
      })()}

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
            <button onClick={waterKhe} disabled={!s.khe.canWater || (!!s.well && s.well.water < s.well.costKhe)} className="btn-outline disabled:opacity-50"
              title={s.well && s.well.water < s.well.costKhe ? 'Giếng không đủ nước' : ''}>{!s.khe.canWater ? 'Đã tưới' : s.well && s.well.water < s.well.costKhe ? 'Hết nước' : `Tưới cây (−${s.well?.costKhe ?? 0}💧)`}</button>
          </div>
        </section>
        );
      })()}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <h2 className="font-semibold">Ô đất ({s.profile.plotCount}/{s.profile.maxPlots})</h2>
          <span className="text-xs text-ink-600">{s.profile.nextPlotLevel != null ? `Ô kế mở ở cấp ${s.profile.nextPlotLevel}` : 'Đã mở tối đa'}</span>
        </div>
        {s.plots.length === 0 ? (
          <p className="p-4 text-sm text-ink-700">Đang mở ô đất…</p>
        ) : (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '838 / 757', backgroundImage: `url(${FARM_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <DogCompanion active={s.profile.dogActive} />
            <div className="absolute inset-0 overflow-y-auto px-[8%] py-[11%]">
              <div className="flex flex-wrap content-start justify-center gap-2">
                {s.plots.map((p) => {
              const prog = p.progress ?? 0;
              const stageSrc = cropStage(p.slug || '', p.ready, prog) || p.asset || '';
              const left = !p.empty && !p.ready && p.readyAt ? secondsUntil(p.readyAt, now) : 0;
              return (
              <button key={p.index} onClick={() => onPlotTap(p)} title={p.crop || (p.tilled ? 'Đã xới — bấm để gieo' : 'Bấm để xới đất')}
                className="relative grid h-[72px] w-[64px] shrink-0 place-items-center bg-contain bg-bottom bg-no-repeat transition active:scale-95"
                style={{ backgroundImage: `url(${p.empty && !p.tilled ? SOIL_UNTILLED : SOIL_TILLED})` }}>
                {/* cây lớn dần */}
                {!p.empty && (stageSrc
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={stageSrc} alt="" onError={(e) => { if (p.asset) (e.currentTarget as HTMLImageElement).src = p.asset; }}
                      className="object-contain transition-all" style={{ maxHeight: `${50 + prog * 45}%` }} />
                  : <span className="leading-none" style={{ fontSize: `${16 + prog * 28}px` }}>{cropEmoji(p.slug || '')}</span>)}
                {/* trạng thái */}
                {p.empty && !p.tilled && <span className="absolute bottom-0.5 rounded bg-black/45 px-1 text-[9px] text-white">Xới</span>}
                {p.empty && p.tilled && <span className="absolute bottom-0.5 rounded bg-emerald-600/80 px-1 text-[9px] text-white">Gieo</span>}
                {p.ready && <span className="absolute -top-0.5 right-0 rounded bg-amber-500 px-1 text-[9px] font-bold text-white shadow">Chín!</span>}
                {!p.empty && !p.ready && (
                  <span className="absolute bottom-0 left-0 right-0">
                    <span className="block h-1 w-full bg-black/20"><span className="block h-full bg-emerald-400" style={{ width: `${prog * 100}%` }} /></span>
                    <span className="block bg-black/40 text-center text-[8px] text-white">{!p.watered ? '💧 cần tưới' : `⏳ ${formatDuration(left)}`}</span>
                  </span>
                )}
              </button>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </section>

      <a href="/game/kho" className="card flex items-center justify-between p-4 transition hover:shadow-lg">
        <span className="font-semibold">📦 Kho chung — xem & bán nông sản, sản phẩm, cá, món ăn</span>
        <span className="btn-outline !py-1.5 text-xs">Mở kho →</span>
      </a>

      {/* Popup chọn hạt để gieo */}
      {planting !== null && (() => {
        const seeds = (s.warehouse || []).filter((w) => w.category === 'SEED' && w.quantity > 0);
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPlanting(null)}>
            <div className="card w-full max-w-sm p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 font-semibold">Gieo hạt vào ô {planting + 1}</h2>
              {seeds.length === 0 ? (
                <p className="text-sm text-ink-500">Chưa có hạt. Mua ở <a href="/game/shop" className="text-brand-600">Cửa hàng</a>.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {seeds.map((sd) => {
                    const cs = sd.slug.replace(/^seed_/, '');
                    return (
                      <button key={sd.slug} onClick={() => plant(planting, cs, sd.name)} className="flex flex-col items-center gap-1 rounded-lg border border-ink-200/70 p-2 hover:bg-emerald-50 dark:border-ink-700 dark:hover:bg-emerald-900/20">
                        {cropFruit(cs) ? <img src={cropFruit(cs)!} alt="" className="h-8 w-8 object-contain" /> : <span className="text-2xl">{cropEmoji(cs)}</span>}
                        <span className="truncate text-[11px]">{sd.name}</span>
                        <span className="text-[10px] text-ink-400">×{sd.quantity}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setPlanting(null)} className="btn-outline mt-3 w-full !py-1.5 text-xs">Đóng</button>
            </div>
          </div>
        );
      })()}

      {/* Popup chăm sóc cây: tưới nước + bón phân */}
      {fertPlot !== null && (() => {
        const ferts = s.fertilizers || [];
        const plot = s.plots.find((p) => p.index === fertPlot);
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setFertPlot(null)}>
            <div className="card w-full max-w-sm p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 font-semibold">Chăm sóc {plot?.crop ? plot.crop : `ô ${fertPlot + 1}`}</h2>
              <p className="mb-3 text-xs text-ink-500">Tưới nước giúp cây khoẻ (tăng sản lượng); bón phân giảm thời gian chín.</p>

              {/* Tưới nước — rút từ giếng (có hạn) */}
              {plot && !plot.watered
                ? (s.well && s.well.water < s.well.costPlot
                    ? <p className="mb-3 rounded-lg bg-rose-50 px-2 py-1.5 text-center text-xs text-rose-500 dark:bg-rose-950/30">💧 Giếng đã cạn nước — chờ nước hồi rồi tưới</p>
                    : <button onClick={() => { water(fertPlot); setFertPlot(null); }} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-2 py-2 text-sm font-medium text-white hover:bg-sky-600">💧 Tưới nước (−{s.well?.costPlot ?? 0} nước giếng)</button>)
                : <p className="mb-3 rounded-lg bg-ink-100 px-2 py-1.5 text-center text-xs text-ink-500 dark:bg-ink-800">✓ Đã tưới nước</p>}

              <p className="mb-1 text-sm font-semibold">Bón phân</p>
              {ferts.length === 0 ? (
                <p className="text-sm text-ink-500">Chưa có phân. Mua ở <a href="/game/shop" className="text-brand-600">Cửa hàng → Dụng cụ trồng trọt</a>.</p>
              ) : (
                <div className="space-y-2">
                  {ferts.map((f) => (
                    <button key={f.slug} onClick={() => { fertilize(fertPlot, f.slug, f.name); setFertPlot(null); }} className="flex w-full items-center justify-between rounded-lg border border-ink-200/70 p-2 text-sm hover:bg-emerald-50 dark:border-ink-700 dark:hover:bg-emerald-900/20">
                      <span>{f.name} <span className="text-ink-400">×{f.quantity}</span></span>
                      <span className="text-xs text-emerald-600">-{Math.round((f.reduceSeconds || 0) / 60)} phút chín</span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setFertPlot(null)} className="btn-outline mt-3 w-full !py-1.5 text-xs">Đóng</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
