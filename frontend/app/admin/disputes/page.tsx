'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Gavel, ShieldCheck, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface Dispute {
  id: string;
  jobId: string;
  reason: string;
  status: string;
  resolution?: string | null;
  decision?: string | null;
  createdAt: string;
  job?: { id: string; title: string };
  raisedBy?: { username: string; displayName?: string | null };
  evidence?: { url: string }[];
}

const TABS = ['OPEN', 'RESOLVED', 'ALL'];
const TAB_LABELS: Record<string, string> = { OPEN: 'Đang mở', RESOLVED: 'Đã xử lý', ALL: 'Tất cả' };

export default function AdminDisputesPage() {
  const [status, setStatus] = useState('OPEN');
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    const qs = status === 'ALL' ? '' : `?status=${status}`;
    api.get<{ data: Dispute[] } | Dispute[]>(`/jobs/admin/disputes${qs}`)
      .then((r) => setItems(Array.isArray(r) ? r : r.data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [status]);

  async function resolve(d: Dispute, decision: 'refund' | 'release') {
    setMsg(''); setErr('');
    try {
      await api.post(`/jobs/admin/disputes/${d.id}/resolve`, { decision, resolution: resolutions[d.id] || undefined });
      setMsg(decision === 'refund' ? 'Đã hoàn tiền cho nhà tuyển dụng.' : 'Đã giải ngân cho freelancer.');
      load();
    } catch (e: any) { setErr(e.message || 'Xử lý thất bại'); }
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Gavel size={22} /> Tranh chấp</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setStatus(t)}
            className={`chip ${status === t ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {msg && <div className="card border-emerald-300 p-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="card border-red-300 p-3 text-sm text-red-500">{err}</div>}

      {loading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {!loading && items.length === 0 && <div className="card p-10 text-center text-ink-500">Không có tranh chấp nào.</div>}

      <div className="space-y-3">
        {items.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/job?id=${d.jobId || d.job?.id}`} className="font-semibold hover:text-brand-600">{d.job?.title || `Công việc ${d.jobId}`}</Link>
                <div className="text-xs text-ink-500">
                  {d.raisedBy && <>Bởi {d.raisedBy.displayName || d.raisedBy.username} · </>}
                  {(() => { try { return formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}
                </div>
              </div>
              <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{d.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{d.reason}</p>
            {(d.evidence?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {d.evidence!.map((e, i) => <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" className="text-brand-600">Bằng chứng #{i + 1}</a>)}
              </div>
            )}
            {d.resolution && <p className="mt-2 text-sm text-ink-500">Kết luận: {d.resolution}</p>}

            {d.status === 'OPEN' && (
              <div className="mt-3 space-y-2">
                <input className="input w-full" placeholder="Ghi chú kết luận (tuỳ chọn)" value={resolutions[d.id] || ''} onChange={(e) => setResolutions((prev) => ({ ...prev, [d.id]: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => resolve(d, 'refund')} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><RotateCcw size={15} /> Hoàn tiền</button>
                  <button onClick={() => resolve(d, 'release')} className="btn-primary inline-flex items-center gap-1 !py-1.5 text-sm"><ShieldCheck size={15} /> Giải ngân</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
