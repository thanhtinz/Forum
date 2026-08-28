'use client';

import { useState, useTransition } from 'react';
import { Pin, PinOff, EyeOff, Eye } from 'lucide-react';
import { toggleCommentPinned, toggleCommentHidden } from '@/app/(site)/comments/actions';

/**
 * Ghim và ẩn bình luận — dành cho quản trị viên.
 *
 * Ẩn chứ không xoá: nội dung còn đó để đối chiếu khi có khiếu nại.
 */
export function CommentModActions({ commentId, pinned, hidden }: {
  commentId: string; pinned: boolean; hidden: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) => start(async () => {
    const r = await fn();
    setError(r.error ?? null);
  });

  return (
    <span className="inline-flex items-center gap-3">
      {/* Bình luận đang ẩn thì không ghim được, ghim thứ không ai thấy là vô nghĩa */}
      {!hidden && (
        <button type="button" disabled={pending} onClick={() => run(() => toggleCommentPinned(commentId))}
          title={pinned ? 'Bỏ ghim bình luận' : 'Ghim bình luận lên đầu'}
          className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-brand-600 disabled:opacity-60">
          {pinned ? <><PinOff size={12} /> Bỏ ghim</> : <><Pin size={12} /> Ghim</>}
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => toggleCommentHidden(commentId))}
        title={hidden ? 'Hiện lại bình luận' : 'Ẩn bình luận khỏi mọi người'}
        className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-rose-500 disabled:opacity-60">
        {hidden ? <><Eye size={12} /> Hiện lại</> : <><EyeOff size={12} /> Ẩn</>}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
