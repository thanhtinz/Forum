'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChefHat, Coins, ArrowUpCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin, formatDuration, secondsUntil } from '@/lib/format';
import { useNow } from '@/lib/useNow';

interface Ingredient { slug: string; name: string; quantity: number }
interface Recipe { slug: string; name: string; cookSeconds: number; reward: number; needSkill: boolean; learned: boolean; skillExp: number; ingredients: Ingredient[]; asset: string | null }
interface Cooking { id: string; name: string; asset: string | null; reward: number; doneAt: string }
interface KitchenState { kitchenLevel: number; maxKitchen: number; exp: number; upgradeCost: number | null; cooking: Cooking[]; recipes: Recipe[] }

export default function KitchenPage() {
  const { user, loading } = useAuth();
  const [s, setS] = useState<KitchenState | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const now = useNow();

  const load = useCallback(() => {
    api.get<KitchenState>('/farm/recipes').then(setS).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { if (!loading && user) load(); }, [user, loading, load]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào bếp.</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const act = async (id: string, fn: () => Promise<any>, ok: string) => {
    setBusy(id); setMsg('');
    try { await fn(); setMsg(ok); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); load(); }
  };
  const doneCount = s.cooking.filter((c) => secondsUntil(c.doneAt, now) <= 0).length;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ChefHat /> Nhà bếp</h1>
          <p className="text-white/90">Bếp cấp {s.kitchenLevel}/{s.maxKitchen} · nấu tối đa {s.kitchenLevel} món · EXP nông trại {formatCoin(s.exp)}</p>
        </div>
        <Link href="/game/farm" className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">← Nông trại</Link>
      </header>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Nâng cấp bếp */}
      <div className="card flex items-center justify-between p-4">
        <div className="text-sm">
          <p className="font-semibold">Nâng cấp bếp</p>
          <p className="text-ink-500">{s.upgradeCost == null ? 'Đã đạt cấp tối đa' : `Tốn ${formatCoin(s.upgradeCost)} EXP nông trại để nấu thêm 1 món cùng lúc`}</p>
        </div>
        <button disabled={!!busy || s.upgradeCost == null} onClick={() => act('upgrade', () => api.post('/farm/kitchen/upgrade'), 'Đã nâng cấp bếp!')}
          className="btn-primary inline-flex items-center gap-1 disabled:opacity-50"><ArrowUpCircle size={16} /> Nâng cấp</button>
      </div>

      {/* Đang nấu */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Đang nấu ({s.cooking.length}/{s.kitchenLevel})</h2>
          {doneCount > 0 && (
            <button disabled={!!busy} onClick={() => act('collect', () => api.post('/farm/kitchen/collect'), 'Đã thu món & bán!')} className="btn-primary !py-1.5 text-xs">Thu {doneCount} món xong</button>
          )}
        </div>
        {s.cooking.length === 0 ? <p className="text-sm text-ink-500">Bếp đang trống. Chọn công thức bên dưới để nấu.</p> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {s.cooking.map((c) => {
              const left = secondsUntil(c.doneAt, now);
              return (
                <div key={c.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${left <= 0 ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-ink-100 dark:border-ink-800'}`}>
                  {c.asset && <img src={c.asset} alt={c.name} className="h-9 w-9 object-contain" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className={`text-xs ${left <= 0 ? 'text-emerald-600' : 'text-ink-400'}`}>{left <= 0 ? '✓ Xong' : `⏳ ${formatDuration(left)}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Công thức */}
      <section className="space-y-2">
        <h2 className="font-semibold">Công thức</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.recipes.map((r) => (
            <div key={r.slug} className="card flex gap-3 p-3">
              {r.asset
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={r.asset} alt={r.name} className="h-14 w-14 shrink-0 object-contain" />
                : <span className="grid h-14 w-14 shrink-0 place-items-center rounded bg-ink-100 text-2xl dark:bg-ink-800">🍽️</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-ink-400">NL: {r.ingredients.map((i) => `${i.name}×${i.quantity}`).join(', ')}</p>
                <p className="text-xs text-ink-500">⏱ {formatDuration(r.cookSeconds)} · <span className="inline-flex items-center gap-0.5 text-amber-600"><Coins size={11} /> {formatCoin(r.reward)}</span></p>
                <div className="mt-1">
                  {r.needSkill && !r.learned
                    ? <button disabled={!!busy} onClick={() => act(r.slug, () => api.post('/farm/kitchen/learn', { recipeSlug: r.slug }), `Đã học ${r.name}`)} className="btn-outline !py-1 text-xs">{busy === r.slug ? <Loader2 size={12} className="animate-spin" /> : `Học (${formatCoin(r.skillExp)} EXP)`}</button>
                    : <button disabled={!!busy || s.cooking.length >= s.kitchenLevel} onClick={() => act(r.slug, () => api.post('/farm/kitchen/cook', { recipeSlug: r.slug }), `Đang nấu ${r.name}`)} className="btn-primary !py-1 text-xs disabled:opacity-50">{busy === r.slug ? <Loader2 size={12} className="animate-spin" /> : 'Nấu'}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
