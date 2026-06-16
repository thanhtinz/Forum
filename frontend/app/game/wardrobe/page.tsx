'use client';

import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Item {
  slug: string; name: string; slot: string; priceCoin: number; reqLevel: number; asset: string | null; owned: boolean;
}

const SLOTS = ['HAIR', 'FACE', 'TOP', 'BOTTOM', 'HAT', 'WING', 'ACCESSORY', 'PET', 'MOUNT'];

export default function WardrobePage() {
  const { user, loading } = useAuth();
  const [slot, setSlot] = useState('TOP');
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState('');

  function load() { api.get<Item[]>(`/wardrobe/shop?slot=${slot}`).then(setItems).catch((e) => setMsg(e.message)); }
  useEffect(() => { if (!loading && user) load(); /* eslint-disable-next-line */ }, [user, loading, slot]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để mở tủ đồ.</div>;

  const act = async (fn: () => Promise<any>) => { try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); } load(); };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Shirt /> Tủ đồ · Pet · Thú cưỡi</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {SLOTS.map((sl) => (
          <button key={sl} onClick={() => setSlot(sl)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${slot === sl ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {sl}
          </button>
        ))}
      </div>

      {msg && <div className="text-center text-sm text-brand-600">{msg}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <div key={it.slug} className="card p-3 text-center">
            <div className="grid h-24 place-items-center rounded-lg bg-ink-50 dark:bg-ink-900">
              {it.asset
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={it.asset} alt={it.name} className="max-h-20 object-contain" />
                : <Shirt className="text-ink-300" />}
            </div>
            <div className="mt-2 truncate text-sm font-medium">{it.name}</div>
            <div className="text-xs text-ink-500">{it.priceCoin.toLocaleString()} coin{it.reqLevel ? ` · Lv${it.reqLevel}` : ''}</div>
            {it.owned ? (
              <button onClick={() => act(() => api.post('/wardrobe/equip', { slug: it.slug }))} className="btn-outline mt-2 w-full !py-1 text-xs">Mặc</button>
            ) : (
              <button onClick={() => act(() => api.post('/wardrobe/buy', { slug: it.slug }))} className="btn-primary mt-2 w-full !py-1 text-xs">Mua</button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full p-6 text-center text-ink-500">Không có vật phẩm trong nhóm này.</p>}
      </div>
    </div>
  );
}
