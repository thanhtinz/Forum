'use client';

import { useState, useTransition } from 'react';
import { Check, Lock, Users } from 'lucide-react';
import { PixelIcon } from '@/components/PixelIcon';
import { votePoll, closePoll } from '@/app/(site)/forum/actions';
import { fmtCount, cn } from '@/lib/utils';
import type { PollView } from '@/lib/poll';

const when = (d: Date) => new Date(d).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/**
 * Bình chọn của chủ đề.
 *
 * Chưa bỏ phiếu và còn hạn thì hiện ô chọn; đã bỏ phiếu hoặc đã đóng thì hiện
 * kết quả. Có nút "Xem kết quả" để tò mò trước khi chọn, và nút "Chọn lại" để
 * đổi ý khi vẫn còn hạn.
 */
export function PollCard({ poll, canClose, loggedIn }: {
  poll: PollView; canClose: boolean; loggedIn: boolean;
}) {
  const [picked, setPicked] = useState<string[]>(poll.options.filter((o) => o.mine).map((o) => o.id));
  const [showResult, setShowResult] = useState(poll.voted || poll.closed);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) => {
    setError(null);
    setPicked((cur) => poll.multiple
      ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
      : [id]);
  };

  const submit = () => start(async () => {
    const r = await votePoll(poll.id, picked);
    if (r.error) { setError(r.error); return; }
    setShowResult(true);
  });

  const results = showResult || poll.closed;

  return (
    <div className="card mb-3 space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex min-w-0 items-start gap-2 font-bold text-ink-900 dark:text-white">
          <PixelIcon name="binhChon" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{poll.question}</span>
        </h2>
        {canClose && !poll.closed && (
          <button type="button" disabled={pending}
            onClick={() => { if (confirm('Đóng cuộc bình chọn này? Sẽ không ai bỏ phiếu được nữa.')) start(() => closePoll(poll.id).then(() => {})); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
            <Lock size={12} /> Đóng
          </button>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((o) => {
          const chosen = picked.includes(o.id);
          if (results) {
            return (
              <div key={o.id} className="relative overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
                {/* Thanh nền chạy theo tỉ lệ phiếu */}
                <div className="absolute inset-y-0 left-0 bg-brand-100 transition-[width] dark:bg-brand-950/60"
                  style={{ width: `${o.percent}%` }} aria-hidden />
                <div className="relative flex items-center gap-2 px-3 py-2 text-sm">
                  {o.mine && <Check size={14} className="shrink-0 text-brand-600" />}
                  <span className={cn('min-w-0 flex-1 break-words', o.mine && 'font-semibold')}>{o.text}</span>
                  <span className="shrink-0 tabular-nums text-ink-500">{o.percent}%</span>
                  <span className="shrink-0 tabular-nums text-xs text-ink-400">{fmtCount(o.votes)}</span>
                </div>
              </div>
            );
          }
          return (
            <label key={o.id}
              className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                chosen ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50')}>
              <input type={poll.multiple ? 'checkbox' : 'radio'} name={`poll-${poll.id}`}
                checked={chosen} onChange={() => toggle(o.id)} className="size-4 shrink-0 accent-brand-500" />
              <span className="min-w-0 break-words">{o.text}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-400">
        {!results && loggedIn && (
          <button type="button" onClick={submit} disabled={pending || picked.length === 0}
            className="btn-primary !py-1.5 text-sm disabled:opacity-50">
            {pending ? 'Đang gửi…' : 'Bình chọn'}
          </button>
        )}
        {!results && !loggedIn && <span>Đăng nhập để bình chọn.</span>}
        {!results && (
          <button type="button" onClick={() => setShowResult(true)} className="hover:text-brand-600">
            Xem kết quả
          </button>
        )}
        {results && !poll.closed && loggedIn && (
          <button type="button" onClick={() => setShowResult(false)} className="hover:text-brand-600">
            {poll.voted ? 'Chọn lại' : 'Quay lại bình chọn'}
          </button>
        )}

        <span className="flex items-center gap-1"><Users size={12} />{fmtCount(poll.voterCount)} người đã bình chọn</span>
        {poll.multiple && <span>· Được chọn nhiều đáp án</span>}
        {poll.closed
          ? <span className="flex items-center gap-1 text-ink-500"><Lock size={12} /> Đã kết thúc</span>
          : poll.closesAt ? <span>· Kết thúc {when(poll.closesAt)}</span> : null}
      </div>
    </div>
  );
}
