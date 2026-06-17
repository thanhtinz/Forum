'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Bookmark, Users2, Wallet, TrendingUp, CheckCircle2, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { catLabel, formatBudget, statusLabel, PROPOSAL_STATUS_LABELS, type Job, type Proposal } from '@/lib/jobs';

type ProposalRow = Proposal & { job?: Job };

interface MyStats {
  asFreelancer: { earned: number; jobsDone: number; ratingAvg: number; ratingCount: number; activeJobs: number };
  asEmployer: { spent: number; postedTotal: number; activeJobs: number; completedJobs: number };
}

export default function MyFreelancePage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'proposals' | 'bookmarks'>('proposals');
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [bookmarks, setBookmarks] = useState<Job[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const unwrap = <T,>(r: { data: T[] } | T[]): T[] => (Array.isArray(r) ? r : r.data);
    api.get<MyStats>('/jobs/stats/me').then(setStats).catch(() => {});
    Promise.all([
      api.get<{ data: ProposalRow[] } | ProposalRow[]>('/jobs/mine/proposals').then(unwrap).catch(() => []),
      api.get<{ data: Job[] } | Job[]>('/jobs/mine/bookmarks').then(unwrap).catch(() => []),
    ]).then(([p, b]) => { setProposals(p as ProposalRow[]); setBookmarks(b as Job[]); })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a>.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Bảng điều khiển Freelancer</h1>
        <Link href="/settings/freelancer" className="btn-outline text-sm">Sửa hồ sơ</Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-500"><Wallet size={14} className="text-emerald-600" /> Đã kiếm</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{stats.asFreelancer.earned.toLocaleString()} <span className="text-sm font-normal text-ink-500">gem</span></div>
            <div className="text-xs text-ink-400">{stats.asFreelancer.activeJobs} việc đang làm</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-500"><CheckCircle2 size={14} className="text-brand-600" /> Việc hoàn thành</div>
            <div className="mt-1 text-xl font-bold">{stats.asFreelancer.jobsDone}</div>
            <div className="flex items-center gap-0.5 text-xs text-ink-400"><Star size={11} className="fill-amber-400 text-amber-400" /> {stats.asFreelancer.ratingAvg.toFixed(1)} ({stats.asFreelancer.ratingCount})</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-500"><TrendingUp size={14} className="text-rose-500" /> Đã chi (tuyển)</div>
            <div className="mt-1 text-xl font-bold text-rose-500">{stats.asEmployer.spent.toLocaleString()} <span className="text-sm font-normal text-ink-500">gem</span></div>
            <div className="text-xs text-ink-400">{stats.asEmployer.completedJobs} việc đã xong</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-500"><FileText size={14} className="text-sky-600" /> Việc đã đăng</div>
            <div className="mt-1 text-xl font-bold">{stats.asEmployer.postedTotal}</div>
            <div className="text-xs text-ink-400">{stats.asEmployer.activeJobs} đang mở</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('proposals')} className={`chip ${tab === 'proposals' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}><FileText size={13} className="mr-1 inline" /> Đề xuất của tôi ({proposals.length})</button>
        <button onClick={() => setTab('bookmarks')} className={`chip ${tab === 'bookmarks' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}><Bookmark size={13} className="mr-1 inline" /> Việc đã lưu ({bookmarks.length})</button>
      </div>

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}

      {!loading && tab === 'proposals' && (
        proposals.length === 0
          ? <div className="card p-10 text-center text-ink-500">Bạn chưa gửi đề xuất nào.</div>
          : <div className="space-y-3">
              {proposals.map((p) => (
                <Link key={p.id} href={p.job ? `/job?id=${p.job.id}` : '#'} className="card block p-4 hover:shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{p.job?.title || 'Công việc'}</h3>
                      {p.job && <span className="chip mt-1 bg-brand-100 text-brand-700">{catLabel(p.job.category)}</span>}
                    </div>
                    <div className="text-right text-sm">
                      <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{PROPOSAL_STATUS_LABELS[p.status] || p.status}</span>
                      <div className="mt-1 text-emerald-600">{p.bidAmount?.toLocaleString()} gem · {p.days} ngày</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
      )}

      {!loading && tab === 'bookmarks' && (
        bookmarks.length === 0
          ? <div className="card p-10 text-center text-ink-500">Chưa có việc nào được lưu.</div>
          : <div className="space-y-3">
              {bookmarks.map((j) => (
                <Link key={j.id} href={`/job?id=${j.id}`} className="card block p-4 hover:shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="chip bg-brand-100 text-brand-700">{catLabel(j.category)}</span>
                        <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{statusLabel(j.status)}</span>
                      </div>
                      <h3 className="mt-1.5 font-semibold">{j.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-600">{formatBudget(j)}</div>
                      <div className="flex items-center justify-end gap-1 text-xs text-ink-500"><Users2 size={13} /> {j.proposalCount} ứng tuyển</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
      )}
    </div>
  );
}
