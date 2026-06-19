'use client';

import { useEffect, useState, useCallback } from 'react';
import { mutate } from 'swr';
import { ChevronLeft, Sprout, ShoppingBag, Coins, Beef, FlaskConical, Fish, Ship, Anchor, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration } from '@/lib/format';
import { cropEmoji } from '@/lib/gameIcons';
import { cropFruit, animalSprite } from '@/lib/cropSprites';

type Tab = 'crop' | 'animal' | 'fertilizer' | 'fishing';

interface Crop { slug: string; name: string; seedPrice: number; sellPrice?: number; growSeconds?: number; exp?: number; yieldMin?: number; yieldMax?: number; reqLevel?: number; asset?: string | null }
interface Animal { slug: string; name: string; buyPrice: number; growSeconds?: number; lifeSeconds?: number; productName?: string | null; productYield?: number; productPrice?: number; sellGrown?: number; asset?: string | null }
interface Fertilizer { slug: string; name: string; price: number; reduceSeconds?: number; asset?: string | null }
interface Boat { slug: string; name: string; price: number; capacity: number; maxDepth: number; asset: string | null; owned: boolean }
interface Rod { slug: string; name: string; tier: number; price: number; asset: string | null; owned: boolean }
interface FishShop { profile: { bait: number; rodTier: number }; baitPack: { uses: number; price: number }; rods: Rod[]; boats: Boat[] }
interface Supply { slug: string; name: string; price: number; kind: string }

type Selected =
  | { kind: 'crop'; item: Crop }
  | { kind: 'animal'; item: Animal }
  | { kind: 'fertilizer'; item: Fertilizer }
  | { kind: 'boat'; item: Boat }
  | { kind: 'rod'; item: Rod }
  | { kind: 'bait' }
  | { kind: 'supply'; item: Supply };

const SUPPLY_ICON: Record<string, string> = { 'feed-poultry': '🌾', 'feed-livestock': '🥬', medicine: '💊' };

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'crop', label: 'Hạt giống', icon: Sprout },
  { key: 'animal', label: 'Vật nuôi', icon: Beef },
  { key: 'fertilizer', label: 'Dụng cụ trồng trọt', icon: FlaskConical },
  { key: 'fishing', label: 'Câu cá', icon: Fish },
];

function Asset({ src, fallback, className = 'h-12 w-12' }: { src?: string | null; fallback: React.ReactNode; className?: string }) {
  const [err, setErr] = useState(false);
  if (src && !err) return <img src={src} alt="" onError={() => setErr(true)} className={`${className} shrink-0 object-contain`} />;
  return <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800`}>{fallback}</span>;
}

export default function GameShopPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('crop');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [ferts, setFerts] = useState<Fertilizer[]>([]);
  const [fish, setFish] = useState<FishShop | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [qty, setQty] = useState(1);

  const loadCoin = useCallback(() => { mutate('/game/character'); }, []);

  const loadAll = useCallback(() => {
    api.get<Crop[]>('/farm/crops').then(setCrops).catch(() => {});
    api.get<Animal[]>('/farm/animals').then(setAnimals).catch(() => {});
    api.get<Fertilizer[]>('/farm/fertilizers').then(setFerts).catch(() => {});
    api.get<FishShop>('/fishing/state').then(setFish).catch(() => {});
    api.get<Supply[]>('/farm/supplies').then(setSupplies).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    loadCoin();
    loadAll();
  }, [user, loading, loadCoin, loadAll]);

  function openView(sel: Selected) { setSelected(sel); setQty(1); setMsg(null); }

  async function confirmBuy() {
    if (!selected) return;
    setBusy(true); setMsg(null);
    try {
      if (selected.kind === 'crop') {
        await api.post('/farm/seed/buy', { cropSlug: selected.item.slug, qty });
        setMsg({ ok: true, text: `Đã mua ${qty} hạt ${selected.item.name}` });
      } else if (selected.kind === 'fertilizer') {
        await api.post('/farm/fertilizer/buy', { slug: selected.item.slug, qty });
        setMsg({ ok: true, text: `Đã mua ${qty} ${selected.item.name}` });
      } else if (selected.kind === 'animal') {
        await api.post('/farm/animal/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      } else if (selected.kind === 'boat') {
        await api.post('/fishing/boat/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      } else if (selected.kind === 'rod') {
        await api.post('/fishing/rod/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      } else if (selected.kind === 'bait') {
        await api.post('/fishing/bait/buy', { packs: qty });
        setMsg({ ok: true, text: `Đã mua ${qty} gói mồi` });
      } else if (selected.kind === 'supply') {
        await api.post('/farm/supply/buy', { slug: selected.item.slug, qty });
        setMsg({ ok: true, text: `Đã mua ${qty} ${selected.item.name}` });
      }
      loadCoin();
      loadAll();
      setSelected(null);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Thất bại' });
    } finally { setBusy(false); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào cửa hàng.</div>;

  const canQty = selected?.kind === 'crop' || selected?.kind === 'fertilizer' || selected?.kind === 'bait' || selected?.kind === 'supply';
  const unitPrice = !selected ? 0
    : selected.kind === 'crop' ? selected.item.seedPrice
    : selected.kind === 'fertilizer' ? selected.item.price
    : selected.kind === 'animal' ? selected.item.buyPrice
    : selected.kind === 'boat' ? selected.item.price
    : selected.kind === 'rod' ? selected.item.price
    : selected.kind === 'bait' ? (fish?.baitPack.price ?? 0)
    : selected.kind === 'supply' ? selected.item.price
    : 0;
  const total = unitPrice * (canQty ? qty : 1);

  return (
    <div className="space-y-4">
      <a href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</a>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-card">
        <ShoppingBag /> <h1 className="text-2xl font-bold">Cửa hàng</h1>
      </header>
      <p className="text-sm text-ink-500">Bấm <b>Xem</b> ở mỗi sản phẩm để xem thông tin, chọn số lượng và mua.</p>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{msg.text}</p>}

      {/* Hạt giống */}
      {tab === 'crop' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((c) => (
            <div key={c.slug} className="card flex items-center gap-3 p-3">
              <Asset src={cropFruit(c.slug) || c.asset} fallback={<span className="text-2xl">{cropEmoji(c.slug)}</span>} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(c.seedPrice)}/hạt{c.reqLevel ? ` · cấp ${c.reqLevel}` : ''}</p>
              </div>
              <button onClick={() => openView({ kind: 'crop', item: c })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
            </div>
          ))}
          {crops.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có hạt giống.</p>}
        </div>
      )}

      {/* Vật nuôi */}
      {tab === 'animal' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => (
            <div key={a.slug} className="card flex items-center gap-3 p-3">
              <Asset src={animalSprite(a.slug) || a.asset} fallback={<Beef size={20} />} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(a.buyPrice)}</p>
              </div>
              <button onClick={() => openView({ kind: 'animal', item: a })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
            </div>
          ))}
          {animals.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có vật nuôi.</p>}
          {/* Thức ăn & thuốc */}
          <div className="col-span-full mt-2 mb-1 text-sm font-semibold">Thức ăn & thuốc</div>
          {supplies.map((sp) => (
            <div key={sp.slug} className="card flex items-center gap-3 p-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-2xl dark:bg-ink-800">{SUPPLY_ICON[sp.slug] || '📦'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{sp.name}</p>
                <p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(sp.price)}</p>
              </div>
              <button onClick={() => openView({ kind: 'supply', item: sp })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
            </div>
          ))}
        </div>
      )}

      {/* Dụng cụ trồng trọt (phân bón) */}
      {tab === 'fertilizer' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ferts.map((f) => (
            <div key={f.slug} className="card flex items-center gap-3 p-3">
              <Asset src={f.asset} fallback={<FlaskConical size={20} />} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(f.price)}/cái</p>
              </div>
              <button onClick={() => openView({ kind: 'fertilizer', item: f })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
            </div>
          ))}
          {ferts.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có dụng cụ trồng trọt.</p>}
        </div>
      )}

      {/* Câu cá: thuyền + cần + mồi */}
      {tab === 'fishing' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Ship size={15} /> Thuyền</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(fish?.boats || []).map((b) => (
                <div key={b.slug} className="card flex items-center gap-3 p-3">
                  <Asset src={b.asset} fallback={<Ship size={20} />} />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{b.name}{b.owned && <span className="ml-1 text-xs text-sky-600">• đang dùng</span>}</p><p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(b.price)}</p></div>
                  <button onClick={() => openView({ kind: 'boat', item: b })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Anchor size={15} /> Cần câu</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(fish?.rods || []).map((r) => (
                <div key={r.slug} className="card flex items-center gap-3 p-3">
                  <Asset src={r.asset} fallback={<Anchor size={20} />} />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.name}{r.owned && <span className="ml-1 text-xs text-emerald-600">• đã có</span>}</p><p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(r.price)} · bậc {r.tier}</p></div>
                  <button onClick={() => openView({ kind: 'rod', item: r })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">🪱 Mồi câu</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card flex items-center gap-3 p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-2xl dark:bg-ink-800">🪱</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">Gói mồi câu</p><p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(fish?.baitPack.price ?? 0)} · {fish?.baitPack.uses ?? 0} lượt · đang có {fish?.profile.bait ?? 0}</p></div>
                <button onClick={() => openView({ kind: 'bait' })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Popup thông tin sản phẩm ───── */}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{selected.kind === 'bait' ? 'Gói mồi câu' : selected.item.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            <div className="flex gap-3">
              <Asset
                src={selected.kind === 'bait' || selected.kind === 'supply' ? null : selected.kind === 'crop' ? (cropFruit(selected.item.slug) || selected.item.asset) : selected.kind === 'animal' ? (animalSprite(selected.item.slug) || selected.item.asset) : selected.item.asset}
                className="h-20 w-20"
                fallback={
                  selected.kind === 'crop' ? <span className="text-3xl">{cropEmoji(selected.item.slug)}</span>
                  : selected.kind === 'animal' ? <Beef size={28} />
                  : selected.kind === 'fertilizer' ? <FlaskConical size={28} />
                  : selected.kind === 'boat' ? <Ship size={28} />
                  : selected.kind === 'rod' ? <Anchor size={28} />
                  : selected.kind === 'supply' ? <span className="text-3xl">{SUPPLY_ICON[selected.item.slug] || '📦'}</span>
                  : <span className="text-3xl">🪱</span>
                }
              />
              <div className="flex-1 space-y-0.5 text-sm text-ink-600 dark:text-ink-300">
                {selected.kind === 'crop' && (() => { const c = selected.item; return (
                  <>
                    <p>Giá hạt: <b>{formatCoin(c.seedPrice)}</b> coin</p>
                    {c.growSeconds ? <p>Thời gian chín: {formatDuration(c.growSeconds)}</p> : null}
                    {(c.yieldMin != null) ? <p>Sản lượng: {c.yieldMin}–{c.yieldMax}</p> : null}
                    {c.sellPrice != null ? <p>Bán nông sản: {formatCoin(c.sellPrice)}/cái</p> : null}
                    {c.reqLevel ? <p>Yêu cầu: cấp nông trại {c.reqLevel}</p> : null}
                  </>
                ); })()}
                {selected.kind === 'animal' && (() => { const a = selected.item; return (
                  <>
                    <p>Giá mua: <b>{formatCoin(a.buyPrice)}</b> coin</p>
                    {a.growSeconds ? <p>Thời gian lớn: {formatDuration(a.growSeconds)}</p> : null}
                    {a.lifeSeconds ? <p>Tuổi thọ: {formatDuration(a.lifeSeconds)}</p> : null}
                    {a.productName ? <p>Sản phẩm: {a.productName}{a.productYield ? ` ×${a.productYield}` : ''}</p> : null}
                  </>
                ); })()}
                {selected.kind === 'fertilizer' && (() => { const f = selected.item; return (
                  <>
                    <p>Giá: <b>{formatCoin(f.price)}</b> coin/cái</p>
                    {f.reduceSeconds ? <p>Giảm {formatDuration(f.reduceSeconds)} thời gian chín</p> : null}
                  </>
                ); })()}
                {selected.kind === 'boat' && (() => { const b = selected.item; return (
                  <>
                    <p>Giá: <b>{formatCoin(b.price)}</b> coin</p>
                    <p>Sức chứa: {b.capacity} cá</p>
                    <p>Ra được độ sâu tối đa: {b.maxDepth}</p>
                    {b.owned ? <p className="text-sky-600">Đang dùng</p> : null}
                  </>
                ); })()}
                {selected.kind === 'rod' && (() => { const r = selected.item; return (
                  <>
                    <p>Giá: <b>{formatCoin(r.price)}</b> coin</p>
                    <p>Bậc cần: {r.tier} (câu được độ sâu tới {r.tier})</p>
                    {r.owned ? <p className="text-emerald-600">Đã có</p> : null}
                  </>
                ); })()}
                {selected.kind === 'bait' && (
                  <>
                    <p>Giá: <b>{formatCoin(fish?.baitPack.price ?? 0)}</b> coin/gói</p>
                    <p>Mỗi gói: {fish?.baitPack.uses ?? 0} lượt câu</p>
                    <p>Đang có: {fish?.profile.bait ?? 0} lượt</p>
                  </>
                )}
                {selected.kind === 'supply' && (() => { const sp = selected.item; return (
                  <>
                    <p>Giá: <b>{formatCoin(sp.price)}</b> coin/cái</p>
                    {sp.slug === 'feed-poultry' && <p>Cho <b>gà, vịt</b> ăn (gia cầm).</p>}
                    {sp.slug === 'feed-livestock' && <p>Cho <b>bò, lợn</b> ăn (gia súc).</p>}
                    {sp.slug === 'medicine' && <p>Chữa bệnh cho vật nuôi.</p>}
                  </>
                ); })()}
              </div>
            </div>

            {/* Số lượng (cây / phân / mồi) */}
            {canQty && (
              <div className="mt-4 flex items-center gap-1 text-sm">
                <span className="text-ink-500">{selected?.kind === 'bait' ? 'Số gói:' : 'Số lượng:'}</span>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded bg-ink-100 dark:bg-ink-800">−</button>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="input w-16 text-center !py-1" />
                <button onClick={() => setQty((q) => q + 1)} className="grid h-8 w-8 place-items-center rounded bg-ink-100 dark:bg-ink-800">+</button>
                {[10, 50, 100].map((n) => <button key={n} onClick={() => setQty(n)} className="rounded bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">{n}</button>)}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm">Tổng: <b className="inline-flex items-center gap-1 text-amber-600"><Coins size={14} /> {formatCoin(total)}</b></span>
              {(selected.kind === 'boat' && selected.item.owned) || (selected.kind === 'rod' && selected.item.owned)
                ? <span className="text-sm font-medium text-emerald-600">Đã sở hữu</span>
                : <button disabled={busy} onClick={confirmBuy} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />} {selected.kind === 'boat' ? 'Mua thuyền' : 'Mua'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
