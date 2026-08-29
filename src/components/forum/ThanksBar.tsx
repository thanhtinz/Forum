'use client';

import { useRef, useState, useTransition } from 'react';
import { HeartHandshake, Gift, Coins } from 'lucide-react';
import { toggleThanks, donatePoints } from '@/app/(site)/forum/actions';
import { DONATE_QUICK, DONATE_MAX, type ThanksState } from '@/lib/thanks';
import { Popover } from '@/components/Popover';

/**
 * Nút "Cảm ơn" kèm dòng liệt kê người đã cảm ơn.
 *
 * Khác nút Thích: cảm ơn là để người ta nhìn thấy tên mình, nên danh sách hiện
 * công khai ngay dưới bài — đúng như forum Việt quãng 2010 vẫn làm.
 */
export function ThanksBar({ threadId, replyId, initial, canThank, callbackUrl, donated = 0, myPoints }: {
  threadId?: string;
  replyId?: string;
  initial: ThanksState;
  /** Khách chưa đăng nhập và chính tác giả thì không bấm được. */
  canThank: boolean;
  callbackUrl: string;
  /** Tổng điểm bài này đã được tặng. */
  donated?: number;
  /** Số điểm người đang xem đang có — để không mời tặng thứ họ không có. */
  myPoints?: number;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [total, setTotal] = useState(donated);
  const [left, setLeft] = useState(myPoints);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const giftRef = useRef<HTMLButtonElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  const donate = (amount: number) => {
    setError(null);
    start(async () => {
      const r = await donatePoints({ threadId, replyId }, amount);
      if (r.error) { setError(r.error); return; }
      setTotal(r.total ?? total);
      setLeft(r.left);
      setSent(amount);
      setOpen(false);
      // Tặng cũng tính là cảm ơn, nên cập nhật luôn nút bên cạnh.
      setState((s) => (s.active ? s : { ...s, active: true, count: s.count + 1 }));
      if (customRef.current) customRef.current.value = '';
    });
  };

  const onClick = () => {
    if (!canThank) { window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`; return; }
    setError(null);
    start(async () => {
      const r = await toggleThanks({ threadId, replyId });
      if (r.error) setError(r.error);
      setState({ active: r.active, people: r.people, count: r.count });
    });
  };

  const hidden = state.count - state.people.length;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onClick} disabled={pending}
        aria-pressed={state.active}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
          state.active
            ? 'border-rose-400 bg-rose-50 font-medium text-rose-600 dark:bg-rose-950/40'
            : 'border-ink-200 text-ink-600 hover:border-rose-300 hover:text-rose-500 dark:border-ink-700 dark:text-ink-300'
        }`}>
        <HeartHandshake size={15} /> {state.active ? 'Đã cảm ơn' : 'Cảm ơn'}
        {state.count > 0 && <span className="opacity-70">{state.count}</span>}
      </button>

      {/* Tặng điểm — đi kèm nút cảm ơn, cùng một chỗ cho khỏi phải tìm */}
      <button ref={giftRef} type="button" disabled={pending}
        onClick={() => {
          if (!canThank) { window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`; return; }
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-sm text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:hover:bg-amber-950/40">
        <Gift size={15} /> Tặng điểm
        {total > 0 && <span className="font-semibold">{total}</span>}
      </button>
      </div>

      <Popover open={open} anchor={giftRef.current} onClose={() => setOpen(false)} align="left"
        className="card w-64 p-3 shadow-card-hover">
        <p className="retro-sub mb-2 text-ink-500">
          Tặng điểm cho bài này
          {left != null && <span className="text-ink-400"> · bạn có {left} điểm</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DONATE_QUICK.map((n) => (
            <button key={n} type="button" disabled={pending || (left != null && left < n)}
              onClick={() => donate(n)}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 dark:border-ink-700">
              {n}
            </button>
          ))}
        </div>
        <form className="mt-2 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const v = parseInt(customRef.current?.value ?? '', 10);
            if (Number.isInteger(v) && v > 0) donate(v);
          }}>
          <input ref={customRef} type="number" min={1} max={DONATE_MAX} placeholder="Số khác…"
            className="input min-w-0 flex-1 !py-1.5 !text-sm" />
          <button type="submit" disabled={pending} title="Tặng điểm" aria-label="Gửi số điểm muốn tặng"
            className="btn-primary shrink-0 !px-2.5 !py-1.5 disabled:opacity-60"><Coins size={14} /></button>
        </form>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </Popover>

      {sent != null && (
        <p className="retro-sub mt-1.5 font-medium text-amber-600">Đã tặng {sent} điểm. Cảm ơn bạn!</p>
      )}

      {(state.count > 0 || total > 0) && (
        <p className="retro-sub retro-rule mt-2 pt-1.5 text-ink-400">
          {state.count > 0 && (
            <>
              <b className="text-ink-500 dark:text-ink-300">{state.count}</b> thành viên đã cảm ơn bài này:{' '}
              <span className="text-ink-500 dark:text-ink-300">{state.people.join(', ')}</span>
              {hidden > 0 && <span> và {hidden} người khác</span>}
            </>
          )}
          {total > 0 && (
            <span className="text-amber-600"> · đã được tặng <b>{total}</b> điểm</span>
          )}
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
