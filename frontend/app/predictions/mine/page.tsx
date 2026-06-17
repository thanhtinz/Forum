'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Wallet, Target, Flame, Trophy, Layers, BarChart3 } from 'lucide-react';
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
interface CreatorStats { totalMarkets: number; open: number; locked: number; settled: number; cancelled: number; totalVolume: number; totalParticipants: number }
interface ParlayLeg { id: string; optionIndex: number; odds: number; status: string; prediction: { id: string; title: string; options: string[] } }
interface Parlay { id: string; amount: number; combinedOdds: number; potentialPayout: number; payout: number; status: string; createdAt: string; legs: ParlayLeg[] }

export default function MyPredictionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [creator, setCreator] = useState<CreatorStats | null>(null);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      api.get<Stats>('/quiz/predictions/stats').catch(() => null),
      api.get<BetRow[]>('/quiz/predictions/my-bets').catch(() => []),
      api.get<CreatorStats>('/quiz/predictions/creator/stats').catch(() => null),
      api.get<Parlay[]>('/quiz/parlays/mine').catch(() => []),
    ]).then(([s, b, c, p]) => { setStats(s); setBets(b as BetRow[]); setCreator(c); setParlays(p as Parlay[]); }).finally(() => setLoading(false));
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

      {creator && creator.totalMarkets > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><BarChart3 size={18} className="text-violet-500" /> Kèo tôi tổ chức</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><div className="text-xs text-ink-500">Tổng kèo</div><div className="text-lg font-bold">{creator.totalMarkets}</div></div>
            <div><div className="text-xs text-ink-500">Đang mở / khoá</div><div className="text-lg font-bold">{creator.open + creator.locked}</div></div>
            <div><div className="text-xs text-ink-500">Tổng cược (volume)</div><div className="text-lg font-bold">{creator.totalVolume.toLocaleString()}</div></div>
            <div><div className="text-xs text-ink-500">Người tham gia</div><div className="text-lg font-bold">{creator.totalParticipants}</div></div>
          </div>
          <div className="mt-2 text-xs text-ink-400">Đã chốt {creator.settled} · Đã huỷ {creator.cancelled}. Mở trang chi tiết từng kèo để xem phân tích dòng tiền theo cửa.</div>
        </div>
      )}

      {parlays.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Layers size={18} /> Vé cược xiên</h2>
          <div className="space-y-2">
            {parlays.map((p) => (
              <div key={p.id} className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.legs.length} kèo · x{p.combinedOdds.toFixed(2)} · {p.amount.toLocaleString()} coin</span>
                  <span className={`text-sm font-medium ${p.status === 'WON' ? 'text-emerald-600' : p.status === 'LOST' ? 'text-red-500' : p.status === 'REFUNDED' ? 'text-amber-600' : 'text-ink-500'}`}>
                    {p.status === 'ACTIVE' ? `Chờ · có thể thắng ${p.potentialPayout.toLocaleString()}` : p.status === 'WON' ? `Thắng +${p.payout.toLocaleString()}` : p.status === 'LOST' ? 'Thua' : `Hoàn ${p.payout.toLocaleString()}`}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {p.legs.map((l) => (
                    <Link key={l.id} href={`/prediction?id=${l.prediction.id}`} className="flex items-center justify-between gap-2 text-xs hover:text-brand-600">
                      <span className="truncate">{l.prediction.title} — {l.prediction.options[l.optionIndex] || `#${l.optionIndex + 1}`} (x{l.odds.toFixed(2)})</span>
                      <span className={`shrink-0 ${l.status === 'WON' ? 'text-emerald-600' : l.status === 'LOST' ? 'text-red-500' : l.status === 'VOID' ? 'text-amber-600' : 'text-ink-400'}`}>
                        {l.status === 'PENDING' ? '•' : l.status === 'WON' ? '✓' : l.status === 'VOID' ? 'huỷ' : '✗'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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
                <span className={`shrink-0 text-sm font-medium ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-red-500' : b.status === 'REFUNDED' ? 'text-amber-600' : b.status === 'CASHED_OUT' ? 'text-sky-600' : 'text-ink-500'}`}>
                  {b.status === 'ACTIVE' ? 'Đang chờ' : b.status === 'WON' ? `+${b.payout.toLocaleString()}` : b.status === 'LOST' ? 'Thua' : b.status === 'CASHED_OUT' ? `Đã bán ${b.payout.toLocaleString()}` : `Hoàn ${b.payout.toLocaleString()}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
