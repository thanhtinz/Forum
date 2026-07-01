'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { CalendarCheck, Flame, Coins, Check, Gift, Loader2 } from 'lucide-react';

interface CheckInRow {
  id: string;
  date: string;
  streak: number;
  reward: number;
  createdAt: string;
}

interface CheckInConfig {
  base: number;
  streakBonus: number;
  maxBonus: number;
  weeklyBonus: number;
}

interface CheckInStatus {
  checkedInToday: boolean;
  currentStreak: number;
  todayReward: number;
  history: CheckInRow[];
  config: CheckInConfig;
}

interface CheckInResult {
  reward: number;
  streak: number;
  balance: number;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function CheckInPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<CheckInStatus>('/checkin/status')
      .then(setStatus)
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, load]);

  async function doCheckIn() {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.post<CheckInResult>('/checkin');
      setResult(res);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="card p-6 text-center text-ink-500">
        Vui lòng đăng nhập để điểm danh.
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center p-10 text-ink-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!status) {
    return <div className="card p-6 text-center text-ink-500">{msg || 'Không tải được dữ liệu.'}</div>;
  }

  const streak = status.currentStreak;
  // Vị trí trong tuần (1..7) của chuỗi hiện tại; nếu đã điểm danh hôm nay
  // dùng streak, nếu chưa thì preview streak+1.
  const previewStreak = status.checkedInToday ? streak : streak + 1;
  const weekPos = ((previewStreak - 1) % 7) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="text-brand-600" />
        <h1 className="text-xl font-bold">Điểm danh hằng ngày</h1>
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <Flame className="text-orange-500" size={28} />
            <div>
              <div className="text-2xl font-bold">{streak}</div>
              <div className="text-sm text-ink-500">Chuỗi ngày liên tiếp</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <Coins className="text-amber-500" size={28} />
            <div>
              <div className="text-2xl font-bold">{status.todayReward}</div>
              <div className="text-sm text-ink-500">
                {status.checkedInToday ? 'Đã nhận hôm nay' : 'Thưởng hôm nay'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <Gift className="text-emerald-500" size={28} />
            <div>
              <div className="text-2xl font-bold">{status.config.weeklyBonus}</div>
              <div className="text-sm text-ink-500">Thưởng mỗi 7 ngày</div>
            </div>
          </div>
        </div>

        {/* Dải 7 ngày */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-medium text-ink-500">Tiến trình tuần</div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const day = i + 1;
              const done = day < weekPos || (status.checkedInToday && day === weekPos);
              const isToday = !status.checkedInToday && day === weekPos;
              const isWeekly = day === 7;
              return (
                <div
                  key={day}
                  className={`flex flex-1 flex-col items-center rounded-lg border p-2 text-center ${
                    done
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : isToday
                      ? 'border-brand-400 ring-2 ring-brand-300'
                      : 'border-ink-200 dark:border-ink-800'
                  }`}
                >
                  <div className="text-xs text-ink-500">Ngày {day}</div>
                  <div className="my-1">
                    {done ? (
                      <Check className="text-brand-600" size={18} />
                    ) : isWeekly ? (
                      <Gift className="text-emerald-500" size={18} />
                    ) : (
                      <Coins className="text-ink-300" size={18} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <button
            className="btn-primary flex w-full items-center justify-center gap-2 py-3 sm:w-auto"
            disabled={status.checkedInToday || busy}
            onClick={doCheckIn}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={18} />
            ) : status.checkedInToday ? (
              <>
                <Check size={18} /> Đã điểm danh hôm nay
              </>
            ) : (
              <>
                <CalendarCheck size={18} /> Điểm danh nhận {status.todayReward} coin
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Coins size={18} />
            <span>
              Điểm danh thành công! +{result.reward} coin (chuỗi {result.streak} ngày). Số dư: {result.balance} coin.
            </span>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-ink-200/70 p-3 font-semibold dark:border-ink-800">
          Lịch sử điểm danh
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-500">
            <tr>
              <th className="p-3">Ngày</th>
              <th className="p-3">Chuỗi</th>
              <th className="p-3">Phần thưởng</th>
            </tr>
          </thead>
          <tbody>
            {status.history.map((h) => (
              <tr key={h.id} className="border-b border-ink-100 dark:border-ink-800">
                <td className="p-3">{fmtDate(h.date)}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="text-orange-500" size={14} /> {h.streak}
                  </span>
                </td>
                <td className="p-3 text-amber-600">+{h.reward}</td>
              </tr>
            ))}
            {status.history.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-ink-500">
                  Chưa có lịch sử điểm danh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
