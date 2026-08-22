'use client';

import { useState, useTransition } from 'react';
import { Heart, MessageSquare, Share2 } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { toggleThreadLike } from '@/app/(site)/forum/actions';

export function ThreadActionBar({ threadId, initialLiked, initialLikeCount, modMenu }: {
  threadId: string; initialLiked: boolean; initialLikeCount: number; modMenu?: React.ReactNode;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const onLike = () => start(async () => {
    const r = await toggleThreadLike(threadId);
    if (r.error) return flash(r.error);
    setLiked(r.active); setCount(r.count);
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
        <button type="button" onClick={onShare} className="btn-outline !rounded-full gap-1.5 !px-4"><Share2 size={16} /> Chia sẻ</button>
        {modMenu}
      </div>
      {toast && <p className="mt-2 text-center text-sm font-medium text-brand-600">{toast}</p>}
    </div>
  );
}
