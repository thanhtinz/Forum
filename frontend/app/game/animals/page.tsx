'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Coins, Beef, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { animalEmoji } from '@/lib/gameIcons';

const BARN_BG = '/game-assets/nongtrai/img/chuong.png';

interface Owned { id: string; slug: string; name: string; grown: boolean; grownAt: string | null; productReady: boolean; productReadyAt: string | null; hasProduct: boolean; diesAt: string | null; asset?: string | null }

export default function AnimalsPage() {
  const { user, loading } = useAuth();
  const [coin, setCoin] = useState(0);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const now = useNow();

  const load = useCallback(() => {
    api.get<{ coin: number; animals: Owned[] }>('/farm/state').then((s) => { setCoin(s.coin); setOwned(s.animals || []); }).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => {
    if (loading || !user) return;
    load();
  }, [user, loading, load]);

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusy(id); setMsg('');
    try { await fn(); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); load(); }
  };

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để nuôi thú.</div>;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Beef /> Vật nuôi</h1>
        <span className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {formatCoin(coin)}</span>
      </header>
      {msg && <p className="text-sm text-rose-500">{msg}</p>}

      {/* Chuồng thú (có asset chuồng) */}
      <section className="card overflow-hidden p-0">
        <div className="flex h-28 items-end justify-between bg-contain bg-center bg-no-repeat p-4" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)), url(${BARN_BG})`, backgroundColor: '#7dd3fc' }}>
          <h2 className="font-semibold text-white drop-shadow">Chuồng thú ({owned.length})</h2>
          <Link href="/game/shop" className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30"><ShoppingBag size={14} /> Mua thêm ở Cửa hàng</Link>
        </div>
        <div className="p-4">
        {owned.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có vật nuôi. Mua ở <Link href="/game/shop" className="text-brand-600">Cửa hàng</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {owned.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-ink-100 text-2xl dark:bg-ink-800">{animalEmoji(a.slug)}</span>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-ink-400">
                      {!a.grown
                        ? `Đang lớn · còn ${formatDuration(secondsUntil(a.grownAt, now))}`
                        : a.hasProduct
                          ? (a.productReady ? 'Có sản phẩm — thu được' : `Sản phẩm sau ${formatDuration(secondsUntil(a.productReadyAt, now))}`)
                          : 'Trưởng thành'}
                    </p>
                    {a.diesAt && <p className="text-[10px] text-rose-400">Hết hạn sau {formatDuration(secondsUntil(a.diesAt, now))}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button disabled={!!busy} onClick={() => act(a.id, () => api.post('/farm/animal/feed', { animalId: a.id }))} className="btn-outline !py-1 text-xs">Cho ăn</button>
                  {a.productReady && <button disabled={!!busy} onClick={() => act(a.id, () => api.post('/farm/animal/collect', { animalId: a.id }))} className="btn-primary !py-1 text-xs">Thu</button>}
                  <button disabled={!!busy} onClick={() => act(a.id, () => api.post('/farm/animal/sell', { animalId: a.id }))} className="btn-outline !py-1 text-xs text-red-600">Bán</button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
