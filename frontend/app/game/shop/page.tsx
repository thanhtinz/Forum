'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sprout, Fish, ShoppingBag, Coins, Beef, FlaskConical, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Tab = 'crop' | 'animal' | 'fertilizer' | 'fishing';

interface Crop { slug: string; name: string; seedPrice: number; reqLevel?: number; asset?: string | null }
interface Animal { slug: string; name: string; buyPrice: number; productName?: string | null; asset?: string | null }
interface Fertilizer { slug: string; name: string; price: number; reduceSeconds?: number; asset?: string | null }
interface FishZone { zone: number; rodPrice: number; baitPrice: number; hasRod: boolean }

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'crop', label: 'Hạt giống', icon: Sprout },
  { key: 'animal', label: 'Vật nuôi', icon: Beef },
  { key: 'fertilizer', label: 'Dụng cụ trồng trọt', icon: FlaskConical },
  { key: 'fishing', label: 'Dụng cụ câu cá', icon: Fish },
];

function Asset({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) {
  const [err, setErr] = useState(false);
  if (src && !err) return <img src={src} alt="" onError={() => setErr(true)} className="h-12 w-12 shrink-0 object-contain" />;
  return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800">{fallback}</span>;
}

export default function GameShopPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('crop');
  const [coin, setCoin] = useState<number | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [ferts, setFerts] = useState<Fertilizer[]>([]);
  const [zones, setZones] = useState<FishZone[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadCoin = useCallback(() => {
    api.get<{ coinBalance?: number }>('/game/character').then((c) => setCoin(c.coinBalance ?? 0)).catch(() => setCoin(0));
  }, []);
  const loadFishing = useCallback(() => {
    api.get<{ zones: FishZone[] }>('/fishing/state').then((s) => setZones(s.zones || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    loadCoin();
    api.get<Crop[]>('/farm/crops').then(setCrops).catch(() => {});
    api.get<Animal[]>('/farm/animals').then(setAnimals).catch(() => {});
    api.get<Fertilizer[]>('/farm/fertilizers').then(setFerts).catch(() => {});
    loadFishing();
  }, [user, loading, loadCoin, loadFishing]);

  async function buy(id: string, fn: () => Promise<any>, okText: string) {
    setBusy(id); setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      loadCoin();
      if (tab === 'fishing') loadFishing();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Mua thất bại' });
    } finally { setBusy(''); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào cửa hàng.</div>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShoppingBag /> Cửa hàng</h1>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {coin?.toLocaleString() ?? '...'}</span>
      </header>
      <p className="text-sm text-ink-500">Mua hạt giống, vật nuôi, dụng cụ trồng trọt và dụng cụ câu cá — thanh toán bằng Coin kiếm trong game.</p>

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
              <Asset src={c.asset} fallback={<Sprout size={20} />} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                {c.reqLevel ? <p className="text-xs text-ink-400">Cấp nông trại {c.reqLevel}</p> : null}
              </div>
              <button disabled={!!busy} onClick={() => buy(c.slug, () => api.post('/farm/seed/buy', { cropSlug: c.slug, qty: 1 }), `Đã mua hạt ${c.name}`)}
                className="btn-outline shrink-0 !py-1.5 text-xs">
                {busy === c.slug ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> {c.seedPrice}</>}
              </button>
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
                {a.productName ? <p className="text-xs text-ink-400">Sản phẩm: {a.productName}</p> : null}
              </div>
              <button disabled={!!busy} onClick={() => buy(a.slug, () => api.post('/farm/animal/buy', { slug: a.slug }), `Đã mua ${a.name}`)}
                className="btn-outline shrink-0 !py-1.5 text-xs">
                {busy === a.slug ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> {a.buyPrice}</>}
              </button>
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
                {f.reduceSeconds ? <p className="text-xs text-ink-400">Giảm {Math.round(f.reduceSeconds / 60)} phút chín</p> : null}
              </div>
              <button disabled={!!busy} onClick={() => buy(f.slug, () => api.post('/farm/fertilizer/buy', { slug: f.slug, qty: 1 }), `Đã mua ${f.name}`)}
                className="btn-outline shrink-0 !py-1.5 text-xs">
                {busy === f.slug ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> {f.price}</>}
              </button>
            </div>
          ))}
          {ferts.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có dụng cụ trồng trọt.</p>}
        </div>
      )}

      {/* Dụng cụ câu cá */}
      {tab === 'fishing' && (
        <div className="space-y-3">
          {zones.map((z) => (
            <div key={z.zone} className="card p-4">
              <p className="mb-2 font-semibold">Khu {z.zone}</p>
              <div className="flex flex-wrap gap-2">
                {z.hasRod ? (
                  <span className="chip bg-emerald-100 text-emerald-700">Đã có cần câu</span>
                ) : (
                  <button disabled={!!busy} onClick={() => buy(`rod${z.zone}`, () => api.post('/fishing/buy-rod', { zone: z.zone }), `Đã mua cần khu ${z.zone}`)}
                    className="btn-outline !py-1.5 text-xs">
                    {busy === `rod${z.zone}` ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> Cần câu · {z.rodPrice}</>}
                  </button>
                )}
                <button disabled={!!busy} onClick={() => buy(`bait${z.zone}`, () => api.post('/fishing/buy-bait', { zone: z.zone, packs: 1 }), `Đã mua mồi khu ${z.zone}`)}
                  className="btn-outline !py-1.5 text-xs">
                  {busy === `bait${z.zone}` ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> Mồi (100 lượt) · {z.baitPrice}</>}
                </button>
              </div>
            </div>
          ))}
          {zones.length === 0 && <p className="text-center text-ink-500">Chưa có dữ liệu khu câu cá.</p>}
        </div>
      )}
    </div>
  );
}
