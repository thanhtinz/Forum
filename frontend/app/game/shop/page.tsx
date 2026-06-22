'use client';

import { useEffect, useState, useCallback } from 'react';
import { mutate } from 'swr';
import { ChevronLeft, Sprout, ShoppingBag, Coins, FlaskConical, Fish, Ship, Anchor, Loader2, X, Gem, Square, Award, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { formatCoin, formatDuration } from '@/lib/format';
import { cropEmoji } from '@/lib/gameIcons';
import { cropFruit } from '@/lib/cropSprites';
import { cssToStyle } from '@/lib/nameEffect';

type Tab = 'crop' | 'fishing' | 'frame' | 'badge' | 'effect';

interface Frame {
  id: string; slug: string; name: string; description?: string | null; imageUrl: string;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}
interface ShopBadge {
  id: string; slug: string; name: string; description?: string | null; imageUrl: string;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}
interface ShopEffect {
  id: string; slug: string; name: string; description?: string | null; css: string;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}
const frameDur = (days?: number | null) => (days == null ? 'vĩnh viễn' : `${days} ngày`);

interface Crop { slug: string; name: string; seedPrice: number; sellPrice?: number; growSeconds?: number; exp?: number; yieldMin?: number; yieldMax?: number; reqLevel?: number; asset?: string | null }
interface Fertilizer { slug: string; name: string; price: number; reduceSeconds?: number; asset?: string | null }
interface Boat { slug: string; name: string; price: number; capacity: number; maxDepth: number; asset: string | null; owned: boolean }
interface Rod { slug: string; name: string; tier: number; price: number; asset: string | null; owned: boolean }
interface FishShop { profile: { bait: number; rodTier: number }; baitPack: { uses: number; price: number }; rods: Rod[]; boats: Boat[] }

type Selected =
  | { kind: 'crop'; item: Crop }
  | { kind: 'fertilizer'; item: Fertilizer }
  | { kind: 'boat'; item: Boat }
  | { kind: 'rod'; item: Rod }
  | { kind: 'bait' };

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'crop', label: 'Trồng trọt', icon: Sprout },
  { key: 'fishing', label: 'Câu cá', icon: Fish },
  { key: 'frame', label: 'Khung avatar', icon: Square },
  { key: 'badge', label: 'Badge', icon: Award },
  { key: 'effect', label: 'Hiệu ứng tên', icon: Sparkles },
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
  const [ferts, setFerts] = useState<Fertilizer[]>([]);
  const [fish, setFish] = useState<FishShop | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameSel, setFrameSel] = useState<Frame | null>(null);
  const [badges, setBadges] = useState<ShopBadge[]>([]);
  const [badgeSel, setBadgeSel] = useState<ShopBadge | null>(null);
  const [effects, setEffects] = useState<ShopEffect[]>([]);
  const [effectSel, setEffectSel] = useState<ShopEffect | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [qty, setQty] = useState(1);

  const loadCoin = useCallback(() => { mutate('/game/character'); }, []);

  const loadAll = useCallback(() => {
    api.get<Crop[]>('/farm/crops').then(setCrops).catch(() => {});
    api.get<Fertilizer[]>('/farm/fertilizers').then(setFerts).catch(() => {});
    api.get<FishShop>('/fishing/state').then(setFish).catch(() => {});
    api.get<Frame[]>('/avatar-frames').then(setFrames).catch(() => {});
    api.get<ShopBadge[]>('/badge-products').then(setBadges).catch(() => {});
    api.get<ShopEffect[]>('/name-effects').then(setEffects).catch(() => {});
  }, []);

  async function buyFrame(currency: 'coin' | 'gem') {
    if (!frameSel) return;
    setBusy(true); setMsg(null);
    try {
      await api.post(`/avatar-frames/${frameSel.id}/buy`, { currency });
      setMsg({ ok: true, text: `Đã mua khung "${frameSel.name}". Vào Trang trí để bật dùng.` });
      setFrameSel(null);
      loadCoin();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(false); }
  }

  async function buyBadge(currency: 'coin' | 'gem') {
    if (!badgeSel) return;
    setBusy(true); setMsg(null);
    try {
      await api.post(`/badge-products/${badgeSel.id}/buy`, { currency });
      setMsg({ ok: true, text: `Đã mua badge "${badgeSel.name}". Vào Trang trí để đeo.` });
      setBadgeSel(null);
      loadCoin();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(false); }
  }

  async function buyEffect(currency: 'coin' | 'gem') {
    if (!effectSel) return;
    setBusy(true); setMsg(null);
    try {
      await api.post(`/name-effects/${effectSel.id}/buy`, { currency });
      setMsg({ ok: true, text: `Đã mua hiệu ứng "${effectSel.name}". Vào Trang trí để bật.` });
      setEffectSel(null);
      loadCoin();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(false); }
  }

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
      } else if (selected.kind === 'boat') {
        await api.post('/fishing/boat/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      } else if (selected.kind === 'rod') {
        await api.post('/fishing/rod/buy', { slug: selected.item.slug });
        setMsg({ ok: true, text: `Đã mua ${selected.item.name}` });
      } else if (selected.kind === 'bait') {
        await api.post('/fishing/bait/buy', { packs: qty });
        setMsg({ ok: true, text: `Đã mua ${qty} gói mồi` });
      }
      loadCoin();
      loadAll();
      setSelected(null);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Thất bại' });
    } finally { setBusy(false); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào cửa hàng.</div>;

  const canQty = selected?.kind === 'crop' || selected?.kind === 'fertilizer' || selected?.kind === 'bait';
  const unitPrice = !selected ? 0
    : selected.kind === 'crop' ? selected.item.seedPrice
    : selected.kind === 'fertilizer' ? selected.item.price
    : selected.kind === 'boat' ? selected.item.price
    : selected.kind === 'rod' ? selected.item.price
    : selected.kind === 'bait' ? (fish?.baitPack.price ?? 0)
    : 0;
  const total = unitPrice * (canQty ? qty : 1);

  return (
    <div className="space-y-4">
      <a href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</a>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
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

      {/* Trồng trọt: hạt giống + phân bón/dụng cụ */}
      {tab === 'crop' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-full mb-1 text-sm font-semibold">Hạt giống</div>
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
          <div className="col-span-full mt-2 mb-1 text-sm font-semibold">Phân bón & dụng cụ</div>
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
          {ferts.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có dụng cụ.</p>}
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

      {/* Khung avatar */}
      {tab === 'frame' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {frames.map((f) => (
            <button key={f.id} onClick={() => { setFrameSel(f); setMsg(null); }}
              className="card flex flex-col items-center gap-2 p-3 text-center transition hover:border-brand-400 hover:shadow-card">
              <div className="relative grid h-20 w-20 place-items-center">
                <span className="h-14 w-14 rounded-full bg-ink-100 dark:bg-ink-800" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.imageUrl} alt={f.name} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              </div>
              <p className="line-clamp-1 text-sm font-medium">{f.name}</p>
              <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-ink-400">
                {f.priceCoin != null && <span className="inline-flex items-center gap-0.5"><Coins size={11} />{formatCoin(f.priceCoin)}</span>}
                {f.priceGem != null && <span className="inline-flex items-center gap-0.5 text-fuchsia-600"><Gem size={11} />{f.priceGem}</span>}
              </p>
            </button>
          ))}
          {frames.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có khung avatar nào.</p>}
        </div>
      )}

      {/* Badge trang trí */}
      {tab === 'badge' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b) => (
            <button key={b.id} onClick={() => { setBadgeSel(b); setMsg(null); }}
              className="card flex flex-col items-center gap-2 p-3 text-center transition hover:border-brand-400 hover:shadow-card">
              <div className="grid h-20 w-20 place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.name} className="h-16 w-16 object-contain" />
              </div>
              <p className="line-clamp-1 text-sm font-medium">{b.name}</p>
              <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-ink-400">
                {b.priceCoin != null && <span className="inline-flex items-center gap-0.5"><Coins size={11} />{formatCoin(b.priceCoin)}</span>}
                {b.priceGem != null && <span className="inline-flex items-center gap-0.5 text-fuchsia-600"><Gem size={11} />{b.priceGem}</span>}
              </p>
            </button>
          ))}
          {badges.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có badge nào.</p>}
        </div>
      )}

      {/* Hiệu ứng tên */}
      {tab === 'effect' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {effects.map((ef) => (
            <button key={ef.id} onClick={() => { setEffectSel(ef); setMsg(null); }}
              className="card flex flex-col items-center gap-2 p-4 text-center transition hover:border-brand-400 hover:shadow-card">
              <span className="text-xl font-bold" style={cssToStyle(ef.css)}>{user?.displayName || user?.username || 'TênCủaBạn'}</span>
              <p className="line-clamp-1 text-sm font-medium text-ink-500">{ef.name}</p>
              <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-ink-400">
                {ef.priceCoin != null && <span className="inline-flex items-center gap-0.5"><Coins size={11} />{formatCoin(ef.priceCoin)}</span>}
                {ef.priceGem != null && <span className="inline-flex items-center gap-0.5 text-fuchsia-600"><Gem size={11} />{ef.priceGem}</span>}
              </p>
            </button>
          ))}
          {effects.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có hiệu ứng nào.</p>}
        </div>
      )}

      {/* ───── Popup khung avatar: demo + giá + mua ───── */}
      {frameSel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setFrameSel(null)}>
          <div className="card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{frameSel.name}</h2>
              <button onClick={() => setFrameSel(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            {/* Demo thử khung trên avatar của bạn */}
            <div className="flex flex-col items-center gap-2 rounded-xl bg-ink-50 py-5 dark:bg-ink-800/50">
              <Avatar user={{ username: user?.username || 'me', avatar: user?.avatar, avatarFrameUrl: frameSel.imageUrl }} size={104} />
              <p className="text-xs text-ink-400">Xem thử khung trên ảnh đại diện của bạn</p>
            </div>
            {frameSel.description && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{frameSel.description}</p>}

            {/* Giá & nút mua theo từng loại tiền */}
            <div className="mt-4 space-y-2">
              {frameSel.priceCoin != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-700">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-amber-600"><Coins size={14} /> {formatCoin(frameSel.priceCoin)} Xu</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(frameSel.coinDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyFrame('coin')} className="btn-outline inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />} Mua</button>
                </div>
              )}
              {frameSel.priceGem != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-200 p-3 dark:border-fuchsia-900/50">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-fuchsia-600"><Gem size={14} /> {frameSel.priceGem} Gem</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(frameSel.gemDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyFrame('gem')} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Gem size={15} />} Mua</button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ink-400">Mua xong vào <b>Cài đặt → Trang trí</b> để bật khung.</p>
          </div>
        </div>
      )}

      {/* ───── Popup badge: demo + giá + mua ───── */}
      {badgeSel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setBadgeSel(null)}>
          <div className="card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{badgeSel.name}</h2>
              <button onClick={() => setBadgeSel(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-ink-50 py-5 dark:bg-ink-800/50">
              <span className="inline-flex items-center gap-1.5 text-lg font-bold">
                {user?.displayName || user?.username || 'Bạn'}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeSel.imageUrl} alt="" className="h-7 w-7 object-contain" />
              </span>
              <p className="text-xs text-ink-400">Xem thử badge cạnh tên của bạn</p>
            </div>
            {badgeSel.description && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{badgeSel.description}</p>}
            <div className="mt-4 space-y-2">
              {badgeSel.priceCoin != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-700">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-amber-600"><Coins size={14} /> {formatCoin(badgeSel.priceCoin)} Xu</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(badgeSel.coinDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyBadge('coin')} className="btn-outline inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />} Mua</button>
                </div>
              )}
              {badgeSel.priceGem != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-200 p-3 dark:border-fuchsia-900/50">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-fuchsia-600"><Gem size={14} /> {badgeSel.priceGem} Gem</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(badgeSel.gemDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyBadge('gem')} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Gem size={15} />} Mua</button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ink-400">Mua xong vào <b>Cài đặt → Trang trí</b> để đeo badge.</p>
          </div>
        </div>
      )}

      {/* ───── Popup hiệu ứng tên: demo + giá + mua ───── */}
      {effectSel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEffectSel(null)}>
          <div className="card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{effectSel.name}</h2>
              <button onClick={() => setEffectSel(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-ink-50 py-6 dark:bg-ink-800/50">
              <span className="text-2xl font-bold" style={cssToStyle(effectSel.css)}>{user?.displayName || user?.username || 'TênCủaBạn'}</span>
              <p className="text-xs text-ink-400">Xem thử hiệu ứng trên tên của bạn</p>
            </div>
            {effectSel.description && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{effectSel.description}</p>}
            <div className="mt-4 space-y-2">
              {effectSel.priceCoin != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-700">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-amber-600"><Coins size={14} /> {formatCoin(effectSel.priceCoin)} Xu</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(effectSel.coinDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyEffect('coin')} className="btn-outline inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />} Mua</button>
                </div>
              )}
              {effectSel.priceGem != null && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-200 p-3 dark:border-fuchsia-900/50">
                  <div className="text-sm">
                    <p className="inline-flex items-center gap-1 font-semibold text-fuchsia-600"><Gem size={14} /> {effectSel.priceGem} Gem</p>
                    <p className="text-xs text-ink-400">Thời hạn: {frameDur(effectSel.gemDays)}</p>
                  </div>
                  <button disabled={busy} onClick={() => buyEffect('gem')} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Gem size={15} />} Mua</button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ink-400">Mua xong vào <b>Cài đặt → Trang trí</b> để bật hiệu ứng.</p>
          </div>
        </div>
      )}

      {/* ───── Popup thông tin sản phẩm ───── */}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{selected.kind === 'bait' ? 'Gói mồi câu' : selected.item.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            <div className="flex gap-3">
              <Asset
                src={selected.kind === 'bait' ? null : selected.kind === 'crop' ? (cropFruit(selected.item.slug) || selected.item.asset) : selected.item.asset}
                className="h-20 w-20"
                fallback={
                  selected.kind === 'crop' ? <span className="text-3xl">{cropEmoji(selected.item.slug)}</span>
                  : selected.kind === 'fertilizer' ? <FlaskConical size={28} />
                  : selected.kind === 'boat' ? <Ship size={28} />
                  : selected.kind === 'rod' ? <Anchor size={28} />
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
