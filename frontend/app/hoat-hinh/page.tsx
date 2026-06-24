'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Star, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Work {
  id: string; slug: string; title: string; titleEnglish?: string | null; coverUrl?: string | null;
  format?: string | null; status: string; season?: string | null; seasonYear?: number | null;
  episodes?: number | null; avgScore: number;
  episodeList?: { number: number }[];
}
interface Genre { id: string; slug: string; name: string }

const LIMIT = 30;

const STATUS = [
  { v: '', label: 'Mọi trạng thái' },
  { v: 'RELEASING', label: 'Đang chiếu' },
  { v: 'FINISHED', label: 'Hoàn thành' },
  { v: 'NOT_YET_RELEASED', label: 'Sắp ra mắt' },
  { v: 'HIATUS', label: 'Tạm ngưng' },
  { v: 'CANCELLED', label: 'Đã huỷ' },
];
const SEASONS = [
  { v: '', label: 'Mọi mùa' },
  { v: 'WINTER', label: 'Đông' },
  { v: 'SPRING', label: 'Xuân' },
  { v: 'SUMMER', label: 'Hạ' },
  { v: 'FALL', label: 'Thu' },
];
const SORTS = [
  { v: 'popularity', label: 'Phổ biến' },
  { v: 'score', label: 'Điểm cao' },
  { v: 'newest', label: 'Mới thêm' },
  { v: 'views', label: 'Lượt xem' },
];

function getPageNums(cur: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (cur > 3) pages.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function HoatHinhContent() {
  const searchParams = useSearchParams();
  const [works, setWorks] = useState<Work[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ genre: searchParams.get('genre') || '', status: '', season: '', year: '', sort: 'popularity', search: '' });
  const [searchInput, setSearchInput] = useState('');

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    api.get<Genre[]>('/anime/genres?type=DONGHUA').then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ type: 'DONGHUA', limit: String(LIMIT), page: String(page) });
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
    api.get<{ data: Work[]; meta: { total: number } }>(`/anime?${qs}`)
      .then((r) => { setWorks(r.data || []); setTotal(r.meta?.total || 0); })
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, [f, page]);

  function updateF(updater: (s: typeof f) => typeof f) {
    setPage(1);
    setF(updater);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setF((s) => ({ ...s, search: searchInput.trim() }));
  }

  function goPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Hoạt hình Trung Quốc</h1>
        <p className="mt-1 text-sm text-white/80">Kho tàng donghua — hoạt hình Trung Quốc được tuyển chọn bởi Trạm GenZ.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form onSubmit={submitSearch} className="flex min-w-[180px] flex-1 items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
          <Search size={16} className="text-ink-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm hoạt hình…" className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </form>
        <select className="input !w-auto" value={f.genre} onChange={(e) => updateF((s) => ({ ...s, genre: e.target.value }))}>
          <option value="">Mọi thể loại</option>
          {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
        </select>
        <select className="input !w-auto" value={f.status} onChange={(e) => updateF((s) => ({ ...s, status: e.target.value }))}>
          {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <select className="input !w-auto" value={f.season} onChange={(e) => updateF((s) => ({ ...s, season: e.target.value }))}>
          {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input type="number" placeholder="Năm" className="input !w-24" value={f.year} onChange={(e) => updateF((s) => ({ ...s, year: e.target.value }))} />
        <select className="input !w-auto" value={f.sort} onChange={(e) => updateF((s) => ({ ...s, sort: e.target.value }))}>
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="p-10 text-center text-ink-500">Đang tải…</p>
      ) : works.length === 0 ? (
        <p className="card p-10 text-center text-ink-500">Chưa có dữ liệu phù hợp.</p>
      ) : (
        <>
          <p className="text-sm text-ink-500">{total} kết quả</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {works.map((w) => {
              const latestEp = w.episodeList?.[0]?.number;
              return (
                <a key={w.id} href={`/anime/detail?slug=${w.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-ink-100 shadow transition hover:shadow-card dark:bg-ink-800">
                  {w.coverUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    : <span className="grid h-full place-items-center text-ink-400"><Film size={24} /></span>}
                  {latestEp != null && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-orange-500 px-1.5 py-0.5 text-[11px] font-bold text-white">Tập {latestEp}</span>
                  )}
                  {w.avgScore > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-amber-300"><Star size={10} /> {w.avgScore.toFixed(1)}</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2.5 pb-2.5 pt-10">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-white" title={w.title}>{w.title}</p>
                    {w.titleEnglish && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{w.titleEnglish}</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-700"
              >
                <ChevronLeft size={15} /> Trước
              </button>
              {getPageNums(page, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="px-2 text-ink-400 select-none">…</span>
                  : (
                    <button
                      key={p}
                      onClick={() => goPage(p as number)}
                      className={`min-w-[36px] rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-brand-700 text-white'
                          : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
              )}
              <button
                onClick={() => goPage(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-700"
              >
                Sau <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HoatHinhPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><HoatHinhContent /></Suspense>;
}
