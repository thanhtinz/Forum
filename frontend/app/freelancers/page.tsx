'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users2, Star, Filter, CheckCircle2, Briefcase, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import type { FreelancerCard, Meta } from '@/lib/jobs';

interface TopFreelancer extends FreelancerCard { isTop: boolean }

export default function FreelancersPage() {
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState<'rating' | 'recent'>('rating');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<FreelancerCard[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState<TopFreelancer[]>([]);

  useEffect(() => { api.get<TopFreelancer[]>('/freelancers/top?limit=5').then(setTop).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (skill) p.set('skill', skill);
    if (country) p.set('country', country);
    p.set('sort', sort);
    p.set('page', String(page));
    try {
      const r = await api.get<{ data: FreelancerCard[]; meta: Meta }>(`/freelancers?${p.toString()}`);
      setItems(r.data); setMeta(r.meta);
    } catch { setItems([]); setMeta(null); }
    finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [sort, page]);

  function apply(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Users2 size={24} /> Freelancer</h1>
          <p className="text-white/90">Tìm freelancer phù hợp cho dự án của bạn.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/freelancer" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">Hồ sơ của tôi</Link>
          <Link href="/jobs" className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-white/90"><Briefcase size={16} /> Việc làm</Link>
        </div>
      </header>

      {top.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Crown size={18} className="text-amber-500" /> Top Freelancer</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((f, i) => (
              <Link key={f.userId} href={`/freelancer?userId=${f.user.id}`} className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 hover:shadow-card dark:border-ink-800">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-ink-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{i + 1}</span>
                <Avatar user={f.user} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate text-sm font-semibold">
                    {f.user.displayName || f.user.username}
                    {f.isTop && <Crown size={13} className="shrink-0 text-amber-500" aria-label="Top Freelancer" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-400 text-amber-400" /> {(f.ratingAvg ?? 0).toFixed(1)}</span>
                    <span>{f.jobsDone} việc xong</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={apply} className="card space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-500"><Filter size={16} /> Bộ lọc</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="input" placeholder="Từ khoá…" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="input" placeholder="Kỹ năng" value={skill} onChange={(e) => setSkill(e.target.value)} />
          <input className="input" placeholder="Quốc gia" value={country} onChange={(e) => setCountry(e.target.value)} />
          <select className="input" value={sort} onChange={(e) => { setSort(e.target.value as 'rating' | 'recent'); setPage(1); }}>
            <option value="rating">Đánh giá cao</option>
            <option value="recent">Mới nhất</option>
          </select>
        </div>
        <div className="flex justify-end"><button type="submit" className="btn-primary">Áp dụng</button></div>
      </form>

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {!loading && items.length === 0 && <div className="card p-10 text-center text-ink-500">Không tìm thấy freelancer.</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <Link key={f.userId} href={`/freelancer?userId=${f.user.id}`} className="card block p-4 hover:shadow-card">
            <div className="flex items-center gap-3">
              <Avatar user={f.user} size={48} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{f.user.displayName || f.user.username}</div>
                <div className="truncate text-xs text-ink-500">{f.headline || '—'}</div>
              </div>
            </div>
            {f.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.skills.slice(0, 5).map((s) => <span key={s} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{s}</span>)}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" /> {(f.ratingAvg ?? 0).toFixed(1)} ({f.ratingCount ?? 0})</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} /> {f.jobsDone} việc xong</span>
              {f.hourlyRate != null && <span>{f.hourlyRate.toLocaleString()} gem/giờ</span>}
              {f.country && <span>{f.country}</span>}
            </div>
          </Link>
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline disabled:opacity-50">Trước</button>
          <span className="text-sm text-ink-500">Trang {meta.page}/{meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline disabled:opacity-50">Sau</button>
        </div>
      )}
    </div>
  );
}
