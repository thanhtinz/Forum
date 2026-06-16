'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { TrendingUp, Coins, Lock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface Prediction {
  id: string;
  title: string;
  description?: string | null;
  options: string[];
  status: 'OPEN' | 'LOCKED' | 'SETTLED';
  correctIndex?: number | null;
  closesAt?: string | null;
  optionTotals: number[];
  pool: number;
  betCount: number;
  myBet?: { optionIndex: number; amount: number; payout: number } | null;
}

const TABS: { key: string; label: string }[] = [
  { key: 'OPEN', label: 'Đang mở' },
  { key: 'LOCKED', label: 'Đã khoá' },
  { key: 'SETTLED', label: 'Đã chốt' },
  { key: '', label: 'Tất cả' },
];

function StatusBadge({ status }: { status: Prediction['status'] }) {
  if (status === 'OPEN')
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">Đang mở</span>;
  if (status === 'LOCKED')
    return <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Lock size={11} /> Đã khoá</span>;
  return <span className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300"><CheckCircle2 size={11} /> Đã chốt</span>;
}

function PredictionCard({ p, onChanged }: { p: Prediction; onChanged: () => void }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [optIdx, setOptIdx] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function placeBet(e: React.FormEvent) {
    e.preventDefault();
    if (optIdx === null) {
      setMsg('Hãy chọn một phương án');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api.post(`/quiz/predictions/${p.id}/bet`, {
        optionIndex: optIdx,
        amount: Number(amount),
      });
      setAmount('');
      setOptIdx(null);
      onChanged();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{p.title}</h3>
          {p.description && <p className="mt-0.5 text-sm text-ink-500">{p.description}</p>}
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="mt-3 space-y-2">
        {p.options.map((opt, idx) => {
          const total = p.optionTotals[idx] ?? 0;
          const pct = p.pool > 0 ? Math.round((total / p.pool) * 100) : 0;
          const isWinner = p.status === 'SETTLED' && p.correctIndex === idx;
          const isMine = p.myBet?.optionIndex === idx;
          return (
            <div key={idx} className="relative overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
              <div
                className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-green-100 dark:bg-green-900/40' : 'bg-brand-100/60 dark:bg-brand-900/30'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  {opt}
                  {isWinner && <CheckCircle2 size={14} className="text-green-600" />}
                  {isMine && <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">Bạn</span>}
                </span>
                <span className="text-xs text-ink-500">{pct}% · {total}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <span className="flex items-center gap-1"><Coins size={13} /> Pool: {p.pool} · {p.betCount} lượt</span>
        {p.closesAt && p.status === 'OPEN' && (
          <span>Đóng: {new Date(p.closesAt).toLocaleString('vi-VN')}</span>
        )}
      </div>

      {p.myBet && (
        <div className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/60">
          Bạn đã đặt <b>{p.myBet.amount}</b> coin vào "{p.options[p.myBet.optionIndex]}".
          {p.status === 'SETTLED' && (
            <> Trả thưởng: <b className={p.myBet.payout > 0 ? 'text-green-600' : 'text-red-600'}>{p.myBet.payout}</b> coin.</>
          )}
        </div>
      )}

      {p.status === 'OPEN' && !p.myBet && (
        <div className="mt-3">
          <button
            className="flex items-center gap-1 text-sm text-brand-600"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Đặt dự đoán
          </button>
          {expanded && (
            <>
              {!user ? (
                <Link href="/login" className="mt-2 block rounded-lg bg-ink-100 px-3 py-2 text-center text-sm dark:bg-ink-800">
                  Đăng nhập để đặt dự đoán
                </Link>
              ) : (
                <form onSubmit={placeBet} className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {p.options.map((opt, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setOptIdx(idx)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${optIdx === idx ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-ink-200 dark:border-ink-700'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder="Số coin"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <button className="btn-primary" disabled={busy}>Đặt</button>
                  </div>
                  {msg && <p className="text-sm text-red-600">{msg}</p>}
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('OPEN');
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const qs = tab ? `?status=${tab}` : '';
    api
      .get<Prediction[]>(`/quiz/predictions${qs}`)
      .then(async (list) => {
        // Nếu đã đăng nhập, lấy thêm thông tin đặt cược của người dùng
        if (user) {
          const detailed = await Promise.all(
            list.map((p) => api.get<Prediction>(`/quiz/predictions/${p.id}`).catch(() => p)),
          );
          setItems(detailed);
        } else {
          setItems(list);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.id]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <TrendingUp size={22} /> Dự đoán
      </h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-500">Đang tải…</p>}
      {!loading && items.length === 0 && (
        <div className="card p-6 text-center text-ink-500">Chưa có dự đoán nào.</div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <PredictionCard key={p.id} p={p} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
