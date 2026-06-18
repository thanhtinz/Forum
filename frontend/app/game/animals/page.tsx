'use client';

import { useEffect, useState, useCallback } from 'react';
import { Coins, Beef, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Owned { id: string; name: string; grown: boolean; productReady: boolean }
interface Tpl { slug: string; name: string; buyPrice: number; productName?: string | null; asset?: string | null }

function Asset({ src }: { src?: string | null }) {
  const [err, setErr] = useState(false);
  if (src && !err) return <img src={src} alt="" onError={() => setErr(true)} className="h-12 w-12 shrink-0 object-contain" />;
  return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800"><Beef size={20} /></span>;
}

export default function AnimalsPage() {
  const { user, loading } = useAuth();
  const [coin, setCoin] = useState(0);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [catalog, setCatalog] = useState<Tpl[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<{ coin: number; animals: Owned[] }>('/farm/state').then((s) => { setCoin(s.coin); setOwned(s.animals || []); }).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => {
    if (loading || !user) return;
    load();
    api.get<Tpl[]>('/farm/animals').then(setCatalog).catch(() => {});
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
        <span className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 font-bold"><Coins size={18} /> {coin.toLocaleString()}</span>
      </header>
      {msg && <p className="text-sm text-rose-500">{msg}</p>}

      {/* Vật nuôi của tôi */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Chuồng của tôi ({owned.length})</h2>
        {owned.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có vật nuôi. Mua ở danh sách bên dưới.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {owned.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-ink-400">{a.productReady ? 'Có sản phẩm' : a.grown ? 'Trưởng thành' : 'Đang lớn'}</p>
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
      </section>

      {/* Mua vật nuôi */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Mua vật nuôi</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((t) => (
            <div key={t.slug} className="flex items-center gap-3 rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
              <Asset src={t.asset} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                {t.productName && <p className="text-xs text-ink-400">Sản phẩm: {t.productName}</p>}
              </div>
              <button disabled={!!busy} onClick={() => act(t.slug, () => api.post('/farm/animal/buy', { slug: t.slug }))} className="btn-outline shrink-0 !py-1.5 text-xs">
                {busy === t.slug ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={12} /> {t.buyPrice}</>}
              </button>
            </div>
          ))}
          {catalog.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có vật nuôi để mua.</p>}
        </div>
      </section>
    </div>
  );
}
