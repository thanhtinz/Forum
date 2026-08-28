'use client';

import { useState } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentForm } from './CommentForm';

/**
 * Nút "Trả lời" của một bình luận, kèm ô soạn mở ra ngay bên dưới.
 *
 * Bình luận chỉ lồng một mức: phản hồi cho một phản hồi vẫn gắn vào bình luận
 * gốc (rootId) để danh sách không thụt lề mãi, và chèn sẵn @tên người được
 * phản hồi để vẫn biết ai đang nói với ai.
 */
export function CommentReply({ gameId, slug, rootId, mention, callbackUrl }: {
  gameId: string;
  slug: string; rootId: string; mention?: string | null; callbackUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-brand-600',
          open && 'text-brand-600')}>
        <Reply size={12} /> Trả lời
      </button>

      {open && (
        // basis-full: hàng công cụ là flex-wrap nên ô soạn tự xuống dòng riêng.
        <div className="mt-2 w-full basis-full">
          <CommentForm gameId={gameId} slug={slug} parentId={rootId} loggedIn callbackUrl={callbackUrl}
            compact autoFocus defaultValue={mention ? `@${mention} ` : undefined}
            onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
