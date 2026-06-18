'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { mutate } from 'swr';
import { ChevronLeft, Beef, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';

const BARN_BG = '/game-assets/nongtrai/img/chuong.png';

interface Owned { id: string; slug: string; name: string; grown: boolean; grownAt: string | null; productReady: boolean; productReadyAt: string | null; hasProduct: boolean; diesAt: string | null; asset?: string | null }

export default function AnimalsPage() {
  const { user, loading } = useAuth();
  const [owned, setOwned] = useState<Owned[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const now = useNow();

  const load = useCallback(() => {
    api.get<{ animals: Owned[] }>('/farm/state').then((s) => { setOwned(s.animals || []); }).catch((e) => setMsg(e.message));
    mutate('/game/character');
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
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Cổng game</Link>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 p-6 text-white shadow-card">
        <Beef /> <h1 className="text-2xl font-bold">Vật nuôi</h1>
      </header>
      {msg && <p className="text-sm text-rose-500">{msg}</p>}

      {/* Chuồng thú — con vật di chuyển qua lại */}
      <section className="card overflow-hidden p-0">
        <div className="relative h-56 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${BARN_BG})`, backgroundColor: '#bbf7d0' }}>
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/35 to-transparent p-3">
            <h2 className="font-semibold text-white drop-shadow">Chuồng thú ({owned.length})</h2>
            <Link href="/game/shop" className="flex items-center gap-1 rounded-lg bg-white/25 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/40"><ShoppingBag size={14} /> Mua thêm</Link>
          </div>
          {/* các con thú (có asset) đi lại dưới sàn chuồng */}
          {owned.filter((a) => a.asset).slice(0, 12).map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.id} src={a.asset!} alt={a.name} className="anim-walk h-12 object-contain" style={{ bottom: `${10 + (i % 3) * 26}px`, animationDuration: `${9 + (i % 5) * 2}s`, animationDelay: `${-(i * 1.3)}s` }} />
          ))}
          {owned.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-white drop-shadow">Chuồng trống — mua thú ở cửa hàng</p>}
        </div>
        <div className="p-4">
        {owned.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có vật nuôi. Mua ở <Link href="/game/shop" className="text-brand-600">Cửa hàng</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {owned.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
                <div className="flex items-center gap-3">
                  {a.asset
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.asset} alt={a.name} className="h-12 w-12 object-contain" />
                    : <span className="grid h-12 w-12 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800"><Beef size={20} /></span>}
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
