'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, X, Gift, Flame, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface CheckInStatus {
  checkedInToday: boolean;
  currentStreak: number;
  todayReward: number;
  history: { date: string; streak: number; reward: number }[];
  config: { base: number; streakBonus: number; maxBonus: number; weeklyBonus: number };
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// yyyy-mm-dd theo UTC (khớp cột @db.Date của check-in)
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Lấy 7 ngày của tuần hiện tại (Thứ 2 → Chủ nhật), reset mỗi tuần
function weekDays(): Date[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = today.getUTCDay(); // 0=CN..6=T7
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + offsetToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
}

export function CheckInDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, loading } = useAuth();
  const [st, setSt] = useState<CheckInStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get<CheckInStatus>('/checkin/status').then(setSt).catch(() => {});
  }, []);

  useEffect(() => { if (!loading && user) load(); }, [user, loading, load]);
  useEffect(() => { if (open) load(); }, [open, load]);

  if (loading || !user || !open) return null;

  async function claim() {
    setBusy(true); setMsg('');
    try {
      const r = await api.post<{ reward: number; streak: number }>('/checkin');
      setMsg(`Điểm danh thành công +${r.reward} xu! 🎉`);
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  const days = weekDays();
  const todayStr = ymd(new Date());
  const checkedSet = new Set((st?.history || []).map((h) => ymd(new Date(h.date))));

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 w-[330px] max-w-[92vw] rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-ink-800">
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600"><CalendarCheck size={16} /> Điểm danh hàng ngày</span>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={16} /></button>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <Flame className="text-amber-500" size={22} />
                <div>
                  <p className="text-xs text-ink-500">Chuỗi điểm danh</p>
                  <p className="font-bold">{st?.currentStreak ?? 0} ngày</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-500">Thưởng hôm nay</p>
                <p className="font-bold text-amber-600">+{st?.todayReward ?? 0} xu</p>
              </div>
            </div>

            {/* Bảng tuần (reset mỗi tuần) */}
            <div>
              <p className="mb-1.5 text-xs text-ink-500">Tuần này (làm mới mỗi thứ Hai):</p>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const key = ymd(d);
                  const checked = checkedSet.has(key);
                  const isToday = key === todayStr;
                  const isFuture = key > todayStr;
                  return (
                    <div key={key} className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 text-[10px] ${isToday ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-ink-200/70 dark:border-ink-700'}`}>
                      <span className="text-ink-400">{DAY_LABELS[i]}</span>
                      <span className={`grid h-6 w-6 place-items-center rounded-full ${checked ? 'bg-emerald-500 text-white' : isFuture ? 'bg-ink-100 text-ink-300 dark:bg-ink-800' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'}`}>
                        {checked ? <Check size={14} /> : d.getUTCDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={claim} disabled={busy || !!st?.checkedInToday}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              <Gift size={16} /> {st?.checkedInToday ? 'Hôm nay đã điểm danh ✓' : 'Điểm danh nhận thưởng'}
            </button>

            {msg && <p className="text-center text-xs text-emerald-600">{msg}</p>}
            <p className="text-center text-[11px] text-ink-400">Điểm danh liên tục để nhận thưởng chuỗi; mỗi 7 ngày có thưởng tuần.</p>
          </div>
      </div>
    </>
  );
}
