'use client';

import { useEffect, useState, useCallback } from 'react';
import { mutate } from 'swr';
import { ChevronLeft, Sprout, ShoppingBag, Coins, Beef, FlaskConical, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration } from '@/lib/format';
import { cropEmoji } from '@/lib/gameIcons';

type Tab = 'crop' | 'animal' | 'fertilizer';

interface Crop { slug: string; name: string; seedPrice: number; sellPrice?: number; growSeconds?: number; exp?: number; yieldMin?: number; yieldMax?: number; reqLevel?: number; asset?: string | null }
interface Animal { slug: string; name: string; buyPrice: number; growSeconds?: number; lifeSeconds?: number; productName?: string | null; productYield?: number; productPrice?: number; sellGrown?: number; asset?: string | null }
interface Fertilizer { slug: string; name: string; price: number; reduceSeconds?: number; asset?: string | null }

type Selected =
  | { kind: 'crop'; item: Crop }
  | { kind: 'animal'; item: Animal }
  | { kind: 'fertilizer'; item: Fertilizer };

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'crop', label: 'Hạt giống', icon: Sprout },
  { key: 'animal', label: 'Vật nuôi', icon: Beef },
  { key: 'fertilizer', label: 'Dụng cụ trồng trọt', icon: FlaskConical },
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [qty, setQty] = useState(1);

  const loadCoin = useCallback(() => { mutate('/game/character'); }, []);

  useEffect(() => {
    if (loading || !user) return;
    loadCoin();
    api.get<Crop[]>('/farm/crops').then(setCrops).catch(() => {});
    api.get<Animal[]>('/farm/animals').then(setAnimals).catch(() => {});
    api.get<Fertilizer[]>('/farm/fertilizers').then(setFerts).catch(() => {});
  }, [user, loading, loadCoin]);

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
      } else {
        await api.post('/farm/animal/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      }
      loadCoin();
      setSelected(null);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(false); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào cửa hàng.</div>;

  const unitPrice = selected ? (selected.kind === 'crop' ? selected.item.seedPrice : selected.kind === 'fertilizer' ? selected.item.price : selected.item.buyPrice) : 0;
  const canQty = selected?.kind === 'crop' || selected?.kind === 'fertilizer';
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
              <Asset src={c.asset} fallback={<span className="text-2xl">{cropEmoji(c.slug)}</span>} />
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
              <Asset src={a.asset} fallback={<Beef size={20} />} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-ink-400 inline-flex items-center gap-1"><Coins size={11} /> {formatCoin(a.buyPrice)}</p>
              </div>
              <button onClick={() => openView({ kind: 'animal', item: a })} className="btn-outline shrink-0 !py-1.5 text-xs">Xem</button>
            </div>
          ))}
          {animals.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có vật nuôi.</p>}
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

      <p className="text-xs text-ink-400">Cần câu & thuyền câu cá mua trong <a href="/game/fishing" className="text-brand-600 hover:underline">trang Câu cá</a>.</p>

      {/* ───── Popup thông tin sản phẩm ───── */}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{selected.item.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            <div className="flex gap-3">
              <Asset
                src={selected.item.asset}
                className="h-20 w-20"
                fallback={selected.kind === 'crop' ? <span className="text-3xl">{cropEmoji(selected.item.slug)}</span> : selected.kind === 'animal' ? <Beef size={28} /> : <FlaskConical size={28} />}
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
              </div>
            </div>

            {/* Số lượng (cây trồng & phân bón) */}
            {canQty && (
              <div className="mt-4 flex items-center gap-1 text-sm">
                <span className="text-ink-500">Số lượng:</span>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded bg-ink-100 dark:bg-ink-800">−</button>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="input w-16 text-center !py-1" />
                <button onClick={() => setQty((q) => q + 1)} className="grid h-8 w-8 place-items-center rounded bg-ink-100 dark:bg-ink-800">+</button>
                {[10, 50, 100].map((n) => <button key={n} onClick={() => setQty(n)} className="rounded bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">{n}</button>)}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm">Tổng: <b className="inline-flex items-center gap-1 text-amber-600"><Coins size={14} /> {formatCoin(total)}</b></span>
              <button disabled={busy} onClick={confirmBuy} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />} Mua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
