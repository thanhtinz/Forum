'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Wallet, Target, Flame, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { RANK_LABELS, RANK_COLORS, statusLabel, catLabel } from '@/lib/predictions';

interface Stats {
  totalBets: number; settledBets: number; won: number; lost: number; winRate: number;
  profit: number; totalStaked: number; bestWinStreak: number; bestLoseStreak: number; rank: string;
}
interface BetRow {
  id: string; optionIndex: number; amount: number; odds: number; payout: number; status: string;
  prediction: { id: string; title: string; status: string; options: string[]; correctIndex?: number | null; category: string };
}

export default function MyPredictionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      api.get<Stats>('/quiz/predictions/stats').catch(() => null),
      api.get<BetRow[]>('/quiz/predictions/my-bets').catch(() => []),
    ]).then(([s, b]) => { setStats(s); setBets(b as BetRow[]); }).finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a>.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Target size={22} /> Dự đoán của tôi</h1>
        <Link href="/predictions" className="btn-outline inline-flex items-center gap-1 text-sm"><TrendingUp size={15} /> Danh sách kèo</Link>
      </div>

      {stats && (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              <div>
                <div className="text-sm text-ink-500">Hạng của bạn</div>
                <span className={`rounded px-2 py-0.5 text-sm font-bold ${RANK_COLORS[stats.rank] || 'bg-ink-100 text-ink-600'}`}>{RANK_LABELS[stats.rank] || stats.rank}</span>
              </div>
            </div>
            <div className={`text-right ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              <div className="text-xs text-ink-500">Lợi nhuận</div>
              <div className="text-2xl font-bold">{stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-500"><Target size={14} className="text-brand-600" /> Tỷ lệ thắng</div><div className="mt-1 text-xl font-bold">{stats.winRate}%</div><div className="text-xs text-ink-400">{stats.won}T / {stats.lost}B</div></div>
            <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-500"><Wallet size={14} className="text-emerald-600" /> Tổng cược</div><div className="mt-1 text-xl font-bold">{stats.totalStaked.toLocaleString()}</div><div className="text-xs text-ink-400">{stats.totalBets} vé</div></div>
            <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-500"><Flame size={14} className="text-orange-500" /> Chuỗi thắng</div><div className="mt-1 text-xl font-bold">{stats.bestWinStreak}</div></div>
            <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-ink-500"><Flame size={14} className="text-red-500" /> Chuỗi thua</div><div className="mt-1 text-xl font-bold">{stats.bestLoseStreak}</div></div>
          </div>
        </>
      )}

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Lịch sử cược</h2>
        {loading && <p className="text-sm text-ink-500">Đang tải…</p>}
        {!loading && bets.length === 0 && <p className="text-sm text-ink-500">Bạn chưa đặt cược nào.</p>}
        <div className="space-y-2">
          {bets.map((b) => (
            <Link key={b.id} href={`/prediction?id=${b.prediction.id}`} className="block rounded-lg border border-ink-200 p-3 hover:shadow-card dark:border-ink-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="chip bg-brand-100 text-brand-700">{catLabel(b.prediction.category)}</span>
                    <span className="text-xs text-ink-400">{statusLabel(b.prediction.status)}</span>
                  </div>
                  <h3 className="mt-1 truncate font-medium">{b.prediction.title}</h3>
                  <div className="text-xs text-ink-500">Cửa: {b.prediction.options[b.optionIndex] || `#${b.optionIndex + 1}`} · {b.amount.toLocaleString()} coin{b.odds > 0 ? ` · x${b.odds.toFixed(2)}` : ''}</div>
                </div>
                <span className={`shrink-0 text-sm font-medium ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-red-500' : b.status === 'REFUNDED' ? 'text-amber-600' : 'text-ink-500'}`}>
                  {b.status === 'ACTIVE' ? 'Đang chờ' : b.status === 'WON' ? `+${b.payout.toLocaleString()}` : b.status === 'LOST' ? 'Thua' : `Hoàn ${b.payout.toLocaleString()}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
