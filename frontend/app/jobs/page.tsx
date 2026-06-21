'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Plus, Briefcase, Users2, Clock, Filter, Tags } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { CATEGORIES, catLabel, formatBudget, BUDGET_TYPE_LABELS, type Job, type Meta } from '@/lib/jobs';

export default function JobsPage() {
  const [category, setCategory] = useState('');
  const [budgetType, setBudgetType] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sort, setSort] = useState<'recent' | 'budget'>('recent');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (budgetType) p.set('budgetType', budgetType);
    if (country) p.set('country', country);
    if (language) p.set('language', language);
    if (q) p.set('q', q);
    if (minBudget) p.set('minBudget', minBudget);
    if (maxBudget) p.set('maxBudget', maxBudget);
    p.set('sort', sort);
    p.set('page', String(page));
    try {
      const r = await api.get<{ data: Job[]; meta: Meta }>(`/jobs?${p.toString()}`);
      setJobs(r.data);
      setMeta(r.meta);
    } catch { setJobs([]); setMeta(null); }
    finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [category, budgetType, sort, page]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Briefcase size={24} /> Việc làm</h1>
          <p className="text-white/90">Tìm dự án freelance, đấu thầu và nhận việc.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/jobs/mine" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">Đề xuất của tôi</Link>
          <Link href="/jobs/manage" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">Việc đã đăng</Link>
          <Link href="/jobs/new" className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-white/90"><Plus size={16} /> Đăng việc</Link>
        </div>
      </header>

      <form onSubmit={applyFilters} className="card space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-500"><Filter size={16} /> Bộ lọc</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Tất cả danh mục</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
          <select className="input" value={budgetType} onChange={(e) => { setBudgetType(e.target.value); setPage(1); }}>
            <option value="">Mọi loại ngân sách</option>
            {Object.entries(BUDGET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="input" placeholder="Quốc gia" value={country} onChange={(e) => setCountry(e.target.value)} />
          <input className="input" placeholder="Ngôn ngữ" value={language} onChange={(e) => setLanguage(e.target.value)} />
          <input className="input" type="number" placeholder="Gem tối thiểu" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
          <input className="input" type="number" placeholder="Gem tối đa" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} />
          <select className="input" value={sort} onChange={(e) => { setSort(e.target.value as 'recent' | 'budget'); setPage(1); }}>
            <option value="recent">Mới nhất</option>
            <option value="budget">Ngân sách cao</option>
          </select>
          <input className="input" placeholder="Từ khoá…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Áp dụng</button>
        </div>
      </form>

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {!loading && jobs.length === 0 && <div className="card p-10 text-center text-ink-500">Không có việc nào phù hợp.</div>}

      <div className="space-y-3">
        {jobs.map((j) => (
          <Link key={j.id} href={`/job?id=${j.id}`} className="card block p-4 transition hover:shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-brand-100 text-brand-700"><Tags size={12} className="mr-1 inline" />{catLabel(j.category)}</span>
                  {j.status !== 'OPEN' && <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{j.status}</span>}
                </div>
                <h3 className="mt-1.5 truncate text-lg font-semibold">{j.title}</h3>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold text-emerald-600">{formatBudget(j)}</div>
                <div className="text-xs text-ink-500">{BUDGET_TYPE_LABELS[j.budgetType] || j.budgetType}</div>
              </div>
            </div>
            {(j.skills?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {j.skills!.slice(0, 8).map((s) => <span key={s} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{s}</span>)}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Avatar user={j.employer} size={18} /> {j.employer.displayName || j.employer.username}</span>
              <span className="flex items-center gap-1"><Users2 size={13} /> {j.proposalCount} ứng tuyển</span>
              {j.country && <span>{j.country}</span>}
              {j.language && <span>{j.language}</span>}
              <span className="flex items-center gap-1"><Clock size={13} /> {(() => { try { return formatDistanceToNow(new Date(j.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
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
