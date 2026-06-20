'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BadgeCheck, Users, ShoppingBag, ChevronLeft } from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { Paginated } from '@/lib/types';

interface Storefront {
  id: string; slug: string; name: string; tagline?: string | null;
  logoUrl?: string | null; isVerified: boolean; followerCount: number; totalSales: number;
}

export default function StoresPage() {
  const { data, isLoading } = useSWR<Paginated<Storefront>>('/marketplace/storefronts?limit=48', fetcher);

  return (
    <div className="space-y-5">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Chợ sản phẩm</Link>
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Gian hàng</h1>
        <p className="text-white/90">Khám phá các gian hàng source code, tool, dịch vụ.</p>
      </header>

      {isLoading ? <div className="card p-10 text-center text-ink-500">Đang tải…</div>
        : !data?.data.length ? <div className="card p-10 text-center text-ink-500">Chưa có gian hàng nào.</div>
        : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((s) => (
              <Link key={s.id} href={`/store?slug=${s.slug}`} className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
                {s.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.logoUrl} alt={s.name} className="h-12 w-12 rounded-xl object-cover" />
                  : <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-ink-800"><ShoppingBag size={20} /></span>}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="truncate">{s.name}</span>
                    {s.isVerified && <BadgeCheck size={15} className="shrink-0 text-brand-500" />}
                  </div>
                  {s.tagline && <p className="truncate text-xs text-ink-500">{s.tagline}</p>}
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                    <span className="inline-flex items-center gap-0.5"><Users size={12} /> {s.followerCount}</span>
                    <span>{s.totalSales} đã bán</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
