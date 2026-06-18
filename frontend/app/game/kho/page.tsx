'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Warehouse, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin } from '@/lib/format';
import { cropEmoji } from '@/lib/gameIcons';

interface WItem { slug: string; name: string; category: string; quantity: number; unitSell: number; asset?: string | null }
interface FishItem { id: string; name: string; weightKg: number; value: number; asset: string | null }

const CAT_LABEL: Record<string, string> = { SEED: 'Hạt giống', CROP: 'Nông sản', PRODUCT: 'Sản phẩm vật nuôi', DISH: 'Món ăn', FERTILIZER: 'Phân bón' };
const CAT_ORDER = ['CROP', 'PRODUCT', 'DISH', 'SEED', 'FERTILIZER'];

export default function WarehousePage() {
  const { user, loading } = useAuth();
  const [coin, setCoin] = useState(0);
  const [items, setItems] = useState<WItem[]>([]);
  const [fish, setFish] = useState<FishItem[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<any>('/farm/state').then((s) => { setCoin(s.coin); setItems(s.warehouse || []); }).catch((e) => setMsg(e.message));
    api.get<FishItem[]>('/fishing/storage').then(setFish).catch(() => {});
  }, []);
  useEffect(() => { if (!loading && user) load(); }, [user, loading, load]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem kho.</div>;

  async function sellItem(it: WItem) {
    try { const r = await api.post<{ value: number }>('/farm/sell', { slug: it.slug, category: it.category, qty: it.quantity }); setMsg(`Đã bán ${it.quantity} ${it.name} (+${formatCoin(r.value)} coin)`); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function sellAllFish() {
    try { const r = await api.post<{ value: number }>('/fishing/sell-all'); setMsg(`Đã bán cá (+${formatCoin(r.value)} coin)`); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function sellFish(id: string) {
    try { await api.post(`/fishing/sell/${id}`); } catch (e: any) { setMsg(e.message); } load();
  }

  const visible = items.filter((w) => w.quantity > 0);
  const groups = CAT_ORDER.map((cat) => ({ cat, items: visible.filter((w) => w.category === cat) })).filter((g) => g.items.length > 0);
  const empty = groups.length === 0 && fish.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</Link>
        <span className="flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-sm font-bold dark:bg-ink-800"><Coins size={16} className="text-amber-500" /> {formatCoin(coin)}</span>
      </div>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-6 text-white shadow-card">
        <Warehouse /> <h1 className="text-2xl font-bold">Kho chung</h1>
      </header>
      <p className="text-sm text-ink-500">Toàn bộ hạt giống, nông sản, sản phẩm vật nuôi, món ăn và cá đều ở đây. Bán để kiếm coin.</p>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {empty && <div className="card p-8 text-center text-ink-500">Kho trống. Trồng cây, nuôi thú, câu cá hoặc nấu ăn để có vật phẩm.</div>}

      {groups.map((g) => (
        <section key={g.cat} className="card p-4">
          <h2 className="mb-2 font-semibold">{CAT_LABEL[g.cat] || g.cat} ({g.items.length})</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.items.map((w) => (
              <div key={w.slug + w.category} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                {w.asset
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={w.asset} alt="" className="h-8 w-8 object-contain" />
                  : <span className="grid h-8 w-8 place-items-center text-lg">{cropEmoji(w.slug.replace(/^(seed_|dish_)/, ''))}</span>}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{w.name} <span className="text-ink-400">×{w.quantity}</span></p><p className="text-xs text-ink-400">{w.unitSell ? `${formatCoin(w.unitSell)}/cái` : 'không bán'}</p></div>
                {w.unitSell > 0 && <button onClick={() => sellItem(w)} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Bán</button>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {fish.length > 0 && (
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Cá ({fish.length})</h2>
            <button onClick={sellAllFish} className="btn-primary !py-1.5 text-xs">Bán toàn bộ cá</button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fish.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                {f.asset && <img src={f.asset} alt="" className="h-8 w-8 object-contain" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{f.name}</p><p className="text-xs text-ink-400">{f.weightKg}kg · {formatCoin(f.value)} coin</p></div>
                <button onClick={() => sellFish(f.id)} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Bán</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
