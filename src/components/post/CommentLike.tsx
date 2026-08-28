'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toggleCommentLike } from '@/app/(site)/comments/actions';
import { cn, fmtCount } from '@/lib/utils';

/**
 * Nút thả tim cho một bình luận (bài viết và game dùng chung).
 *
 * Đổi mặt trái tim ngay khi bấm rồi mới hỏi máy chủ, hỏng thì trả lại như cũ:
 * đây là nút bấm nhiều nhất trang, chờ hết một vòng máy chủ mới thấy đổi thì
 * người dùng tưởng bấm trượt và bấm thêm mấy lần nữa.
 */
export function CommentLike({ commentId, initialLiked, initialCount, loggedIn, callbackUrl }: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
  loggedIn: boolean;
  callbackUrl: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!loggedIn) { router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`); return; }
    const truoc = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    setBusy(true);
    const r = await toggleCommentLike(commentId);
    setBusy(false);
    if (r.error) { setLiked(truoc.liked); setCount(truoc.count); return; }
    setLiked(r.active);
    setCount(r.count);
  };

  return (
    <button type="button" onClick={onClick} disabled={busy}
      title={liked ? 'Bỏ thích' : 'Thích bình luận này'}
      className={cn('flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-60',
        liked ? 'text-rose-500' : 'text-ink-400 hover:text-rose-500')}>
      <Heart size={13} className={liked ? 'fill-current' : undefined} />
      {count > 0 ? fmtCount(count) : 'Thích'}
    </button>
  );
}
