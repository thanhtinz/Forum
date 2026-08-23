'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck } from 'lucide-react';
import { toggleBlock } from '@/app/(site)/user/blocked/actions';
import { cn } from '@/lib/utils';

export function BlockButton({ targetId, targetName, initialBlocked, compact }: {
  targetId: string; targetName: string; initialBlocked: boolean; compact?: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    const confirmText = blocked
      ? `Bỏ chặn ${targetName}?`
      : `Chặn ${targetName}? Hai người sẽ không nhắn tin hay theo dõi nhau được nữa.`;
    if (!confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const r = await toggleBlock(targetId);
      if (r.error) { setError(r.error); return; }
      setBlocked(r.blocked);
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={pending}
        title={blocked ? 'Bỏ chặn' : 'Chặn thành viên này'}
        className={cn('inline-flex items-center gap-1.5 rounded-full border text-sm font-medium transition-colors disabled:opacity-60',
          compact ? 'px-3 py-1.5' : 'px-3.5 py-2',
          blocked
            ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950'
            : 'border-ink-200 text-ink-500 hover:border-rose-300 hover:text-rose-600 dark:border-ink-700 dark:hover:border-rose-800')}>
        {blocked ? <ShieldCheck size={15} /> : <Ban size={15} />}
        {blocked ? 'Bỏ chặn' : 'Chặn'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
