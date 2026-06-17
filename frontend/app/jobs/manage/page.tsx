'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Users2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { catLabel, formatBudget, statusLabel, JOB_STATUS_LABELS, type Job } from '@/lib/jobs';

const TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang mở' },
  { key: 'IN_PROGRESS', label: 'Đang làm' },
  { key: 'SUBMITTED', label: 'Đã nộp' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
  { key: 'DISPUTED', label: 'Tranh chấp' },
];

export default function ManageJobsPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<{ data: Job[] } | Job[]>('/jobs/mine/posted')
      .then((r) => setJobs(Array.isArray(r) ? r : r.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => tab === 'ALL' ? jobs : jobs.filter((j) => j.status === tab), [jobs, tab]);

  if (authLoading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a>.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Briefcase size={22} /> Việc đã đăng</h1>
        <Link href="/jobs/new" className="btn-primary text-sm">Đăng việc</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>
            {t.label}{t.key !== 'ALL' ? ` (${jobs.filter((j) => j.status === t.key).length})` : ` (${jobs.length})`}
          </button>
        ))}
      </div>

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {!loading && filtered.length === 0 && <div className="card p-10 text-center text-ink-500">Không có việc nào.</div>}

      <div className="space-y-3">
        {filtered.map((j) => (
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
    </div>
  );
}
