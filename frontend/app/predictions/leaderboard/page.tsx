'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { RANK_LABELS, RANK_COLORS } from '@/lib/predictions';

interface Row {
  userId: string; profit: number; won: number; total: number; staked: number; winRate: number; rank: string;
  user?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
}
interface CreatorRow { userId: string; markets: number; user?: Row['user'] }

const PERIODS = [
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'all', label: 'Tất cả' },
];

export default function PredLeaderboardPage() {
  const [period, setPeriod] = useState('week');
  const [players, setPlayers] = useState<Row[]>([]);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ players: Row[]; creators: CreatorRow[] }>(`/quiz/predictions/leaderboard?period=${period}`)
      .then((r) => { setPlayers(r.players || []); setCreators(r.creators || []); })
      .catch(() => { setPlayers([]); setCreators([]); })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy size={22} className="text-amber-500" /> BXH Dự đoán</h1>
        <Link href="/predictions" className="btn-outline inline-flex items-center gap-1 text-sm"><TrendingUp size={15} /> Danh sách kèo</Link>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`chip ${period === p.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>{p.label}</button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-500">Đang tải…</p>}

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Lợi nhuận cao nhất</h2>
        {players.length === 0 && <p className="text-sm text-ink-500">Chưa có dữ liệu.</p>}
        <div className="space-y-1.5">
          {players.map((r, i) => (
            <div key={r.userId} className="flex items-center gap-3 rounded-lg border border-ink-200 p-2.5 dark:border-ink-800">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-ink-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{i + 1}</span>
              {r.user && <Avatar user={r.user} size={36} />}
              <div className="min-w-0 flex-1">
                <Link href={r.user ? `/profile?username=${r.user.username}` : '#'} className="truncate text-sm font-semibold hover:text-brand-600">{r.user?.displayName || r.user?.username || 'Ẩn danh'}</Link>
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${RANK_COLORS[r.rank] || 'bg-ink-100 text-ink-600'}`}>{RANK_LABELS[r.rank] || r.rank}</span>
                  <span>{r.winRate}% thắng · {r.total} kèo</span>
                </div>
              </div>
              <div className={`text-right font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.profit >= 0 ? '+' : ''}{r.profit.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Crown size={18} className="text-amber-500" /> Top nhà tạo kèo</h2>
        {creators.length === 0 && <p className="text-sm text-ink-500">Chưa có dữ liệu.</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {creators.map((c) => (
            <div key={c.userId} className="flex items-center gap-3 rounded-lg border border-ink-200 p-2.5 dark:border-ink-800">
              {c.user && <Avatar user={c.user} size={32} />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.user?.displayName || c.user?.username || 'Ẩn danh'}</span>
              <span className="text-xs text-ink-500">{c.markets} kèo</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
