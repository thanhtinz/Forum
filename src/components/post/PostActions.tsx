'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp, Share2, Star } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { toggleLike, toggleFavorite } from '@/app/(site)/posts/[slug]/actions';

export interface PostActionsProps {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialSaved: boolean;
  initialSaveCount: number;
}

export function PostActions({ postId, initialLiked, initialLikeCount, initialSaved, initialSaveCount }: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const onLike = () => start(async () => {
    const r = await toggleLike(postId);
    if (r.error) return flash(r.error);
    setLiked(r.active); setLikeCount(r.count);
  });

  const onSave = () => start(async () => {
    const r = await toggleFavorite(postId);
    if (r.error) return flash(r.error);
    setSaved(r.active); setSaveCount(r.count);
    flash(r.active ? 'Đã lưu vào bộ sưu tập' : 'Đã bỏ lưu');
  });

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); flash('Đã sao chép liên kết'); }
    } catch { /* người dùng huỷ */ }
  };

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-ink-400">Bài viết hay chứ? Tặng một lượt thích nhé</p>
      <div className="mt-4 flex items-end justify-center gap-10 sm:gap-14">
        <Action icon={<ThumbsUp size={26} />} label="Thích" count={likeCount} active={liked} activeColor="text-brand-500" onClick={onLike} disabled={pending} />
        <Action icon={<Share2 size={26} />} label="Chia sẻ" onClick={onShare} />
        <Action icon={<Star size={26} className={saved ? 'fill-current' : ''} />} label="Lưu" count={saveCount} active={saved} activeColor="text-amber-500" onClick={onSave} disabled={pending} />
      </div>
      {toast && <p className="mt-3 text-sm font-medium text-brand-600">{toast}</p>}
    </div>
  );
}

function Action({ icon, label, count, active, activeColor, onClick, disabled }: {
  icon: React.ReactNode; label: string; count?: number; active?: boolean; activeColor?: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn('group flex flex-col items-center gap-1.5 text-ink-500 transition-colors disabled:opacity-60',
        active ? activeColor : 'hover:text-ink-800 dark:hover:text-ink-200')}>
      <span className="transition-transform group-active:scale-90">{icon}</span>
      <span className="text-sm font-medium">
        {label}{count != null && count > 0 ? ` ${fmtCount(count)}` : ''}
      </span>
    </button>
  );
}
