'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search, SlidersHorizontal, Store, Star, ShoppingBag, Gem } from 'lucide-react';
import { api, fetcher } from '@/lib/api';

interface Product {
  id: string; title: string; slug: string; gemPrice: number; isFree: boolean;
  thumbnailUrl?: string | null; salesCount: number; ratingAvg: number; type?: string;
}
interface Paginated { data: Product[]; meta: { total: number; page: number; limit: number; totalPages: number } }
interface Category { id: string; name: string; slug: string; icon?: string | null }

const TYPES: Record<string, string> = {
  SOURCE_CODE: 'Source code', TOOL: 'Tool', SERVICE: 'Dịch vụ', ACCOUNT: 'Tài khoản', TEMPLATE: 'Template', DESIGN: 'Thiết kế',
};

function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/product?slug=${p.slug}`} className="card group overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
        {p.thumbnailUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.thumbnailUrl} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-ink-300"><ShoppingBag size={36} /></div>}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand-600">{p.title}</h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-brand-600">{p.isFree ? 'Miễn phí' : <span className="inline-flex items-center gap-1"><Gem size={13} /> {p.gemPrice}</span>}</span>
          <span className="flex items-center gap-2 text-xs text-ink-400">
            {p.ratingAvg > 0 && <span className="inline-flex items-center gap-0.5"><Star size={12} className="fill-amber-400 text-amber-400" /> {p.ratingAvg.toFixed(1)}</span>}
            <span>{p.salesCount} bán</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);

  const { data: cats } = useSWR<Category[]>('/marketplace/categories', fetcher);

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (type) params.set('type', type);
  if (sort) params.set('sort', sort);
  if (query.trim()) params.set('q', query.trim());
  params.set('page', String(page));
  const { data, isLoading } = useSWR<Paginated>(`/marketplace/products?${params}`, fetcher);

  useEffect(() => { setPage(1); }, [category, type, sort, query]);
  const totalPages = data?.meta.totalPages || 1;

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Chợ sản phẩm</h1>
            <p className="text-white/90">Source code, tool, template, dịch vụ… mua bằng Gem.</p>
          </div>
          <Link href="/marketplace/stores" className="hidden shrink-0 items-center gap-1 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25 sm:inline-flex"><Store size={16} /> Gian hàng</Link>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm…" className="input w-full pl-10 text-ink-900" />
        </form>
      </header>

      {/* Danh mục */}
      {cats && cats.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button onClick={() => setCategory('')} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${!category ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>Tất cả</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.slug)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${category === c.slug ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>
              {c.icon ? `${c.icon} ` : ''}{c.name}
            </button>
          ))}
        </div>
      )}

      {/* Bộ lọc loại + sắp xếp */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <label className="relative">
          <SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <select className="input w-full pl-9 sm:w-44" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Mọi loại</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <select className="input sm:w-44" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="popular">Bán chạy</option>
          <option value="new">Mới nhất</option>
          <option value="rating">Đánh giá cao</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
        </select>
        {data && <span className="hidden text-sm text-ink-400 sm:ml-auto sm:block">{data.meta.total} sản phẩm</span>}
      </div>

      {/* Lưới sản phẩm */}
      {isLoading ? <div className="card p-10 text-center text-ink-500">Đang tải…</div>
        : !data?.data.length ? <div className="card p-10 text-center text-ink-500">Không có sản phẩm phù hợp.</div>
        : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.data.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
          <span className="text-sm text-ink-500">{page}/{totalPages}</span>
          <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
        </div>
      )}
    </div>
  );
}
