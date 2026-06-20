'use client';

import useSWR from 'swr';
import { BadgeCheck, Users, ShoppingBag, Sparkles, Pin } from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { Paginated } from '@/lib/types';

interface Storefront {
  id: string; slug: string; name: string; tagline?: string | null;
  logoUrl?: string | null; isVerified: boolean; followerCount: number; totalSales: number;
}

export default function MarketplacePage() {
  const { data, isLoading } = useSWR<Paginated<Storefront>>('/marketplace/storefronts?limit=24', fetcher);
  const { data: featured } = useSWR<{ stores: any[]; products: any[] }>('/marketplace/featured', fetcher);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Chợ gian hàng</h1>
        <p className="text-white/90">Khám phá các gian hàng source code, tool, dịch vụ.</p>
      </header>

      {featured && (featured.products.length > 0 || featured.stores.length > 0) && (
        <section className="card border-amber-300/60 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-600"><Sparkles size={18} /> Đề xuất</h2>
          {featured.products.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {featured.products.map((p) => (
                <a key={p.id} href={`/store?slug=`} className="rounded-xl border border-amber-200/60 p-2 text-center dark:border-ink-800">
                  {p.thumbnailUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.thumbnailUrl} alt={p.title} className="mb-1 h-20 w-full rounded object-cover" />
                    : <div className="mb-1 grid h-20 place-items-center rounded bg-ink-100 dark:bg-ink-800"><Pin size={18} className="text-amber-500" /></div>}
                  <div className="truncate text-xs font-medium">{p.title}</div>
                  <div className="text-[11px] text-brand-600">{p.isFree ? 'Miễn phí' : `${p.gemPrice} gem`}</div>
                </a>
              ))}
            </div>
          )}
          {featured.stores.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featured.stores.map((s) => (
                <a key={s.id} href={`/store?slug=${s.slug}`} className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700 dark:bg-ink-800">
                  {s.name}{s.isVerified && <BadgeCheck size={13} />}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {isLoading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {data && data.data.length === 0 && (
        <div className="card p-10 text-center text-ink-500">Chưa có gian hàng nào.</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((s) => (
          <a key={s.id} href={`/store?slug=${s.slug}`} className="card flex items-center gap-3 p-4 hover:shadow-lg">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600 dark:bg-ink-800">
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt={s.name} className="h-full w-full object-cover" />
              ) : <ShoppingBag size={22} />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold">
                <span className="truncate">{s.name}</span>
                {s.isVerified && <BadgeCheck size={15} className="shrink-0 text-brand-500" />}
              </div>
              {s.tagline && <p className="truncate text-sm text-ink-500">{s.tagline}</p>}
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                <Users size={12} /> {s.followerCount} theo dõi · {s.totalSales} đã bán
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
