'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteOwnComment } from '@/app/(site)/comments/actions';
import { useEditScope } from '@/components/EditScope';

/** Sửa và xoá — chỉ hiện với bình luận của chính người đang xem. */
export function CommentOwnerActions({ commentId }: { commentId: string }) {
  const { editing, setEditing } = useEditScope();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!confirm('Xoá bình luận này? Các phản hồi bên dưới cũng mất theo và không khôi phục được.')) return;
    start(async () => {
      const r = await deleteOwnComment(commentId);
      setError(r.error ?? null);
    });
  };

  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={() => setEditing(!editing)}
        className={cn('inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-brand-600',
          editing && 'text-brand-600')}>
        <Pencil size={12} /> Sửa
      </button>
      <button type="button" disabled={pending} onClick={onDelete}
        className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-rose-500 disabled:opacity-60">
        <Trash2 size={12} /> Xoá
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
