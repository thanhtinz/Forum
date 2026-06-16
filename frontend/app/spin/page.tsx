'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import {
  Gift,
  Coins,
  Loader2,
  Sparkles,
  History,
  Trophy,
  X,
  CircleDot,
} from 'lucide-react';

interface Segment {
  id: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  rewardType: string;
  rewardAmount: number;
}

interface Wheel {
  id: string;
  name: string;
  costCoin: number;
  isActive: boolean;
  segments: Segment[];
}

interface SpinResult {
  segment: {
    label: string;
    rewardType: string;
    rewardAmount: number;
    color?: string | null;
    icon?: string | null;
  };
  balance: number;
}

interface HistoryItem {
  id: string;
  segmentLabel: string;
  rewardType: string;
  rewardAmount: number;
  createdAt: string;
}

const REWARD_LABEL: Record<string, string> = {
  coin: 'Coin',
  item: 'Vật phẩm',
  badge: 'Huy hiệu',
  nothing: 'Chúc may mắn lần sau',
};

function SegmentIcon({ seg, size = 22 }: { seg: { icon?: string | null; rewardType: string }; size?: number }) {
  if (seg.icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={seg.icon} alt="" className="rounded object-cover" style={{ width: size, height: size }} />;
  }
  if (seg.rewardType === 'coin') return <Coins size={size} className="text-amber-500" />;
  if (seg.rewardType === 'badge') return <Trophy size={size} className="text-violet-500" />;
  if (seg.rewardType === 'item') return <Gift size={size} className="text-emerald-500" />;
  return <CircleDot size={size} className="text-ink-400" />;
}

export default function SpinPage() {
  const { user } = useAuth();
  const [wheel, setWheel] = useState<Wheel | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  function loadWheel() {
    api
      .get<Wheel | null>('/spin/wheel')
      .then((w) => setWheel(w))
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }
  function loadHistory() {
    if (!user) return;
    api.get<HistoryItem[]>('/spin/history').then(setHistory).catch(() => {});
  }
  useEffect(() => {
    loadWheel();
  }, []);
  useEffect(() => {
    loadHistory();
  }, [user]);

  async function doSpin() {
    if (!wheel || spinning) return;
    setMsg('');
    setResult(null);
    setSpinning(true);
    setHighlight(null);

    // Hiệu ứng nhấp nháy qua các ô trong lúc chờ kết quả
    let i = 0;
    const flicker = setInterval(() => {
      if (wheel.segments.length) {
        setHighlight(wheel.segments[i % wheel.segments.length].id);
        i++;
      }
    }, 90);

    try {
      const res = await api.post<SpinResult>('/spin');
      // Cho hiệu ứng chạy thêm chút rồi dừng vào ô trúng
      await new Promise((r) => setTimeout(r, 900));
      clearInterval(flicker);
      const won = wheel.segments.find((s) => s.label === res.segment.label);
      setHighlight(won?.id ?? null);
      setResult(res);
      setBalance(res.balance);
      loadHistory();
    } catch (e: any) {
      clearInterval(flicker);
      setHighlight(null);
      setMsg(e.message || 'Quay thất bại');
    } finally {
      setSpinning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-ink-400" />
      </div>
    );
  }

  if (!wheel) {
    return (
      <div className="card p-8 text-center text-ink-500">
        <Gift className="mx-auto mb-2 text-ink-300" size={32} />
        Hiện chưa có vòng quay nào đang mở. Vui lòng quay lại sau.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="text-amber-500" size={22} /> Vòng quay may mắn
        </h1>
        {balance != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <Coins size={15} /> {balance.toLocaleString('vi-VN')} coin
          </span>
        )}
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{wheel.name}</h2>
          <span className="inline-flex items-center gap-1 text-sm text-ink-500">
            <Coins size={14} className="text-amber-500" /> Chi phí mỗi lượt:{' '}
            <b className="text-ink-700 dark:text-ink-200">{wheel.costCoin.toLocaleString('vi-VN')}</b> coin
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {wheel.segments.map((s) => {
            const active = highlight === s.id;
            return (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                  active
                    ? 'scale-105 border-amber-400 bg-amber-50 shadow-md dark:bg-amber-500/10'
                    : 'border-ink-200 dark:border-ink-700'
                }`}
                style={s.color && !active ? { borderColor: s.color } : undefined}
              >
                <SegmentIcon seg={s} size={26} />
                <span className="text-sm font-medium">{s.label}</span>
                {s.rewardType === 'coin' && s.rewardAmount > 0 && (
                  <span className="text-xs text-amber-600">+{s.rewardAmount} coin</span>
                )}
                {s.rewardType !== 'coin' && (
                  <span className="text-xs text-ink-400">{REWARD_LABEL[s.rewardType] ?? s.rewardType}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          {user ? (
            <button onClick={doSpin} disabled={spinning} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {spinning ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {spinning ? 'Đang quay…' : `Quay (-${wheel.costCoin} coin)`}
            </button>
          ) : (
            <p className="text-sm text-ink-500">Đăng nhập để tham gia quay thưởng.</p>
          )}
          {msg && <p className="text-sm text-red-500">{msg}</p>}
        </div>
      </div>

      {/* Reveal kết quả */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResult(null)}>
          <div
            className="card relative w-full max-w-sm animate-[pop_.3s_ease] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setResult(null)} className="absolute right-3 top-3 text-ink-400 hover:text-ink-600">
              <X size={18} />
            </button>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
              <SegmentIcon seg={result.segment} size={36} />
            </div>
            {result.segment.rewardType === 'nothing' ? (
              <p className="text-lg font-bold">Chúc bạn may mắn lần sau!</p>
            ) : (
              <>
                <p className="text-sm text-ink-500">Bạn đã trúng</p>
                <p className="text-xl font-bold text-amber-600">{result.segment.label}</p>
                {result.segment.rewardType === 'coin' && result.segment.rewardAmount > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-amber-600">
                    <Coins size={15} /> +{result.segment.rewardAmount} coin
                  </p>
                )}
              </>
            )}
            <button onClick={() => setResult(null)} className="btn-primary mt-4">
              Tuyệt vời!
            </button>
          </div>
        </div>
      )}

      {/* Lịch sử */}
      {user && (
        <div className="card p-4">
          <h2 className="mb-2 flex items-center gap-1 font-semibold">
            <History size={16} /> Lịch sử quay gần đây
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-500">Bạn chưa quay lần nào.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2">
                    <SegmentIcon seg={{ rewardType: h.rewardType }} size={16} />
                    {h.segmentLabel}
                    {h.rewardType === 'coin' && h.rewardAmount > 0 && (
                      <span className="text-xs text-amber-600">+{h.rewardAmount} coin</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-400">
                    {new Date(h.createdAt).toLocaleString('vi-VN')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pop {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
