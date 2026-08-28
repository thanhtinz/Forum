'use client';

import { useState, useTransition } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { toggleFollow } from '@/app/(site)/comments/actions';

export function FollowButton({ targetId, initialFollowing, initialCount, self }: {
  targetId: string; initialFollowing: boolean; initialCount: number; self: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  if (self) return null;

  const onClick = () => start(async () => {
    const r = await toggleFollow(targetId);
    if (r.error) return;
    setFollowing(r.active); setCount(r.count);
  });

  return (
    <button type="button" onClick={onClick} disabled={pending}
      className={cn('btn shrink-0 disabled:opacity-60',
        following ? 'border border-ink-300 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'
                  : 'bg-brand-500 text-white hover:bg-brand-600')}>
      {following ? <><UserCheck size={16} /> Đang theo dõi</> : <><UserPlus size={16} /> Theo dõi</>}
      {count > 0 && <span className="opacity-80">· {fmtCount(count)}</span>}
    </button>
  );
}
