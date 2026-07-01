'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { mutate } from 'swr';
import { Warehouse, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin } from '@/lib/format';
import { cropEmoji } from '@/lib/gameIcons';
import { cropFruit } from '@/lib/cropSprites';

interface WItem { slug: string; name: string; category: string; quantity: number; unitSell: number; asset?: string | null }

const CAT_LABEL: Record<string, string> = { SEED: 'Hạt giống', CROP: 'Nông sản', PRODUCT: 'Sản phẩm vật nuôi', DISH: 'Món ăn', FERTILIZER: 'Phân bón' };
const CAT_ORDER = ['CROP', 'PRODUCT', 'DISH', 'SEED', 'FERTILIZER'];
// Ảnh mặc định cho vật phẩm đặc biệt không có asset lưu sẵn
const KNOWN_ASSET: Record<string, string> = {
  'qua-khe': '/game-assets/nongtrai/pixel/qua-khe.png',
  'trung': '/game-assets/nongtrai/products/trung.png',
  'trung-vit': '/game-assets/nongtrai/products/trung-vit.png',
  'thit-heo': '/game-assets/nongtrai/products/thit.png',
  'thit-bo': '/game-assets/nongtrai/products/thit.png',
};

export default function WarehousePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<WItem[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<any>('/farm/state').then((s) => { setItems(s.warehouse || []); }).catch((e) => setMsg(e.message));
    mutate('/game/character');
  }, []);
  useEffect(() => { if (!loading && user) load(); }, [user, loading, load]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem kho.</div>;

  async function sellItem(it: WItem) {
    try { const r = await api.post<{ value: number }>('/farm/sell', { slug: it.slug, category: it.category, qty: it.quantity }); setMsg(`Đã bán ${it.quantity} ${it.name} (+${formatCoin(r.value)} coin)`); }
    catch (e: any) { setMsg(e.message); } load();
  }

  const visible = items.filter((w) => w.quantity > 0);
  const groups = CAT_ORDER.map((cat) => ({ cat, items: visible.filter((w) => w.category === cat) })).filter((g) => g.items.length > 0);
  const empty = groups.length === 0;

  return (
    <div className="space-y-4">
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</Link>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <Warehouse /> <h1 className="text-2xl font-bold">Kho chung</h1>
      </header>
      <p className="text-sm text-ink-500">Toàn bộ hạt giống, nông sản, sản phẩm vật nuôi và món ăn đều ở đây. Bán để kiếm coin.</p>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {empty && <div className="card p-8 text-center text-ink-500">Kho trống. Trồng cây, nuôi thú hoặc nấu ăn để có vật phẩm.</div>}

      {groups.map((g) => (
        <section key={g.cat} className="card p-4">
          <h2 className="mb-2 font-semibold">{CAT_LABEL[g.cat] || g.cat} ({g.items.length})</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.items.map((w) => {
              const cropKey = w.slug.replace(/^seed_/, '');
              const icon = cropFruit(cropKey) || w.asset || KNOWN_ASSET[w.slug];
              return (
              <div key={w.slug + w.category} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 text-sm dark:border-ink-800">
                {icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={icon} alt="" className="h-8 w-8 object-contain" />
                  : <span className="grid h-8 w-8 place-items-center text-lg">{cropEmoji(w.slug.replace(/^(seed_|dish_)/, ''))}</span>}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{w.name} <span className="text-ink-400">×{w.quantity}</span></p><p className="text-xs text-ink-400">{w.unitSell ? `${formatCoin(w.unitSell)}/cái` : 'không bán'}</p></div>
                {w.unitSell > 0 && <button onClick={() => sellItem(w)} className="btn-primary shrink-0 !px-2 !py-1 text-xs">Bán</button>}
              </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
