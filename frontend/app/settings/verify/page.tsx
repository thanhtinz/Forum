'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { BadgeCheck, Check, X, Clock, Loader2 } from 'lucide-react';

interface Requirements {
  minPosts: number;
  minReactionsReceived: number;
  minReputation: number;
  minThreads: number;
}
interface Stats {
  posts: number;
  threads: number;
  reputation: number;
  reactionsReceived: number;
}
interface Status {
  verified: boolean;
  requirements: Requirements;
  stats: Stats;
  eligible: boolean;
  pending: boolean;
  latestRequest: { id: string; status: string; note?: string | null; createdAt: string } | null;
}

function ReqRow({ label, value, target }: { label: string; value: number; target: number }) {
  const ok = value >= target;
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {ok ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-500" />}
          {label}
        </span>
        <span className={ok ? 'font-medium text-green-600' : 'text-ink-500'}>
          {value}/{target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className={`h-full rounded-full ${ok ? 'bg-green-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Status>('/verification/status').then(setStatus).catch((e) => setErr(e.message));
  }

  useEffect(() => {
    if (!loading && user) load();
  }, [loading, user]);

  async function submit() {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await api.post('/verification/request');
      setMsg('Đã gửi yêu cầu xác minh! Vui lòng chờ quản trị viên duyệt.');
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng đăng nhập.</div>;
  if (!status) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const { requirements: req, stats } = status;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck size={24} className="text-blue-500" />
        <h1 className="text-xl font-bold">Đăng ký tích xanh</h1>
      </div>

      {status.verified ? (
        <div className="card flex items-center gap-3 p-4 text-green-700 dark:text-green-400">
          <BadgeCheck size={20} className="text-blue-500" />
          <span>Tài khoản của bạn đã được xác minh.</span>
        </div>
      ) : status.pending ? (
        <div className="card flex items-center gap-3 p-4 text-amber-700 dark:text-amber-400">
          <Clock size={20} />
          <span>Yêu cầu của bạn đang chờ quản trị viên duyệt.</span>
        </div>
      ) : status.eligible ? (
        <div className="card flex items-center gap-3 p-4 text-green-700 dark:text-green-400">
          <Check size={20} />
          <span>Bạn đã đủ điều kiện để gửi yêu cầu xác minh!</span>
        </div>
      ) : (
        <div className="card flex items-center gap-3 p-4 text-ink-600 dark:text-ink-300">
          <X size={20} className="text-red-500" />
          <span>Bạn chưa đủ điều kiện. Hãy hoạt động tích cực hơn nhé!</span>
        </div>
      )}

      {status.latestRequest?.status === 'REJECTED' && status.latestRequest.note && (
        <div className="card p-4 text-sm text-red-600">
          Yêu cầu trước bị từ chối: {status.latestRequest.note}
        </div>
      )}

      <div className="card space-y-4 p-4">
        <h2 className="font-semibold">Điều kiện xác minh</h2>
        <ReqRow label="Bài viết" value={stats.posts} target={req.minPosts} />
        <ReqRow label="Chủ đề" value={stats.threads} target={req.minThreads} />
        <ReqRow label="Cảm xúc nhận được" value={stats.reactionsReceived} target={req.minReactionsReceived} />
        <ReqRow label="Điểm uy tín" value={stats.reputation} target={req.minReputation} />
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!status.verified && !status.pending && status.eligible && (
        <button className="btn-primary flex items-center gap-2" disabled={busy} onClick={submit}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
          Gửi yêu cầu xác minh
        </button>
      )}
    </div>
  );
}
