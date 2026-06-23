'use client';

import { useEffect, useState } from 'react';
import { Search, Star, Film, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';

interface Work {
  id: string; type: string; slug: string; title: string; titleEnglish?: string | null; coverUrl?: string | null;
  format?: string | null; status: string; season?: string | null; seasonYear?: number | null;
  episodes?: number | null; chapters?: number | null; avgScore: number; ratingCount: number;
  genres: { name: string; slug: string }[];
}
interface Genre { id: string; slug: string; name: string }

const TYPE_TABS = [
  { v: 'ANIME', label: 'Anime' },
  { v: 'MANGA', label: 'Manga' },
];
const STATUS = [
  { v: '', label: 'Mọi trạng thái' },
  { v: 'RELEASING', label: 'Đang phát hành' },
  { v: 'FINISHED', label: 'Hoàn thành' },
  { v: 'NOT_YET_RELEASED', label: 'Sắp ra mắt' },
  { v: 'HIATUS', label: 'Tạm ngưng' },
  { v: 'CANCELLED', label: 'Đã huỷ' },
];
const SEASONS = [{ v: '', label: 'Mọi mùa' }, { v: 'WINTER', label: 'Đông' }, { v: 'SPRING', label: 'Xuân' }, { v: 'SUMMER', label: 'Hạ' }, { v: 'FALL', label: 'Thu' }];
const FORMATS = [
  { v: '', label: 'Mọi dạng' },
  { v: 'TV', label: 'TV / Series' },
  { v: 'MOVIE,OVA', label: 'Movie / OVA' },
];
const SORTS = [{ v: 'popularity', label: 'Phổ biến' }, { v: 'score', label: 'Điểm cao' }, { v: 'newest', label: 'Mới thêm' }, { v: 'views', label: 'Lượt xem' }];

const typeIcon = (t: string) => (t === 'MANGA' ? <BookOpen size={12} /> : <Film size={12} />);

export default function AnimeListPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ type: 'ANIME', genre: '', status: '', format: '', season: '', year: '', sort: 'popularity', search: '' });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { api.get<Genre[]>('/anime/genres').then(setGenres).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
    qs.set('limit', '30');
    api.get<{ data: Work[]; meta: { total: number } }>(`/anime?${qs.toString()}`)
      .then((r) => { setWorks(r.data || []); setTotal(r.meta?.total || 0); })
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, [f]);

  function submitSearch(e: React.FormEvent) { e.preventDefault(); setF((s) => ({ ...s, search: searchInput.trim() })); }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Anime &amp; Manga</h1>
        <p className="mt-1 text-sm text-white/80">Khám phá kho tàng anime và manga cung cấp bởi Trạm GenZ.</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {TYPE_TABS.map((t) => (
          <button key={t.v} onClick={() => setF((s) => ({ ...s, type: t.v, format: '' }))}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${f.type === t.v ? 'bg-brand-600 text-white shadow' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form onSubmit={submitSearch} className="flex min-w-[180px] flex-1 items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
          <Search size={16} className="text-ink-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={`Tìm ${f.type === 'MANGA' ? 'manga' : 'anime'}…`} className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </form>
        <select className="input !w-auto" value={f.genre} onChange={(e) => setF((s) => ({ ...s, genre: e.target.value }))}>
          <option value="">Mọi thể loại</option>
          {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
        </select>
        {f.type === 'ANIME' && (
          <select className="input !w-auto" value={f.format} onChange={(e) => setF((s) => ({ ...s, format: e.target.value }))}>
            {FORMATS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        )}
        <select className="input !w-auto" value={f.status} onChange={(e) => setF((s) => ({ ...s, status: e.target.value }))}>
          {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <select className="input !w-auto" value={f.season} onChange={(e) => setF((s) => ({ ...s, season: e.target.value }))}>
          {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input type="number" placeholder="Năm" className="input !w-24" value={f.year} onChange={(e) => setF((s) => ({ ...s, year: e.target.value }))} />
        <select className="input !w-auto" value={f.sort} onChange={(e) => setF((s) => ({ ...s, sort: e.target.value }))}>
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
            {works.map((w) => (
              <a key={w.id} href={`/anime/detail?slug=${w.slug}`} className="card group overflow-hidden p-0 transition hover:shadow-card">
                <div className="relative aspect-[3/4] bg-ink-100 dark:bg-ink-800">
                  {w.coverUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    : <span className="grid h-full place-items-center text-ink-400">{typeIcon(w.type)}</span>}
                  {w.avgScore > 0 && (
                    <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-amber-300"><Star size={10} /> {w.avgScore.toFixed(1)}</span>
                  )}
                  <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{typeIcon(w.type)} {w.format || w.type}</span>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-sm font-medium leading-tight" title={w.title}>{w.titleEnglish || w.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{w.seasonYear || ''}{w.episodes ? ` · ${w.episodes} tập` : w.chapters ? ` · ${w.chapters} ch.` : ''}</p>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
