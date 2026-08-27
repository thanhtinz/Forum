'use client';

import { useState, useTransition } from 'react';
import { HeartHandshake } from 'lucide-react';
import { toggleThanks } from '@/app/(site)/forum/actions';
import type { ThanksState } from '@/lib/thanks';

/**
 * Nút "Cảm ơn" kèm dòng liệt kê người đã cảm ơn.
 *
 * Khác nút Thích: cảm ơn là để người ta nhìn thấy tên mình, nên danh sách hiện
 * công khai ngay dưới bài — đúng như forum Việt quãng 2010 vẫn làm.
 */
export function ThanksBar({ threadId, replyId, initial, canThank, callbackUrl }: {
  threadId?: string;
  replyId?: string;
  initial: ThanksState;
  /** Khách chưa đăng nhập và chính tác giả thì không bấm được. */
  canThank: boolean;
  callbackUrl: string;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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

      {state.count > 0 && (
        <p className="retro-sub retro-rule mt-2 pt-1.5 text-ink-400">
          <b className="text-ink-500 dark:text-ink-300">{state.count}</b> thành viên đã cảm ơn bài này:{' '}
          <span className="text-ink-500 dark:text-ink-300">{state.people.join(', ')}</span>
          {hidden > 0 && <span> và {hidden} người khác</span>}
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
