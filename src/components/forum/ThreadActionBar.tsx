'use client';

import { useState, useTransition } from 'react';
import { Heart, MessageSquare, Share2, Bell, BellOff } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { toggleThreadLike, toggleThreadFollow } from '@/app/(site)/forum/actions';

export function ThreadActionBar({ threadId, initialLiked, initialLikeCount, initialFollowing, initialFollowCount, modMenu }: {
  threadId: string; initialLiked: boolean; initialLikeCount: number;
  initialFollowing: boolean; initialFollowCount: number; modMenu?: React.ReactNode;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);
  const [following, setFollowing] = useState(initialFollowing);
  const [followCount, setFollowCount] = useState(initialFollowCount);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const onLike = () => start(async () => {
    const r = await toggleThreadLike(threadId);
    if (r.error) return flash(r.error);
    setLiked(r.active); setCount(r.count);
  });

  const onFollow = () => start(async () => {
    const r = await toggleThreadFollow(threadId);
    if (r.error) return flash(r.error);
    setFollowing(r.following); setFollowCount(r.count);
    flash(r.following ? 'Sẽ báo cho bạn khi có trả lời mới' : 'Đã bỏ theo dõi chủ đề này');
  });

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); flash('Đã sao chép liên kết'); }
    } catch { /* huỷ */ }
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={onLike} disabled={pending}
          className={cn('btn-outline !rounded-full gap-1.5 !px-4 disabled:opacity-60', liked && 'border-accent-500/40 text-accent-500')}>
          <Heart size={16} className={liked ? 'fill-current' : ''} /> Thích <span className="text-ink-400">{fmtCount(count)}</span>
        </button>
        <a href="#tra-loi" className="btn-outline !rounded-full gap-1.5 !px-4"><MessageSquare size={16} /> Trả lời</a>
        <button type="button" onClick={onFollow} disabled={pending}
          title={following ? 'Bỏ theo dõi chủ đề' : 'Theo dõi để nhận báo khi có trả lời mới'}
          className={cn('btn-outline !rounded-full gap-1.5 !px-4 disabled:opacity-60', following && 'border-brand-500/40 text-brand-600')}>
          {following ? <BellOff size={16} /> : <Bell size={16} />}
          {following ? 'Đang theo dõi' : 'Theo dõi'}
          {followCount > 0 && <span className="text-ink-400">{fmtCount(followCount)}</span>}
        </button>
        <button type="button" onClick={onShare} className="btn-outline !rounded-full gap-1.5 !px-4"><Share2 size={16} /> Chia sẻ</button>
        {modMenu}
      </div>
      {toast && <p className="mt-2 text-center text-sm font-medium text-brand-600">{toast}</p>}
    </div>
  );
}
