'use client';

import { useActionState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, X } from 'lucide-react';
import { updateComment, type CommentEditState } from '@/app/(site)/comments/actions';
import { ActionForm } from '@/components/ActionForm';
import { MentionTextarea } from '@/components/MentionTextarea';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { useEditScope } from '@/components/EditScope';

/** Lưu xong Prisma cũng chạm updatedAt, nên chênh vài giây thì chưa tính là sửa. */
const EDITED_AFTER_MS = 60_000;

/** Nội dung một bình luận: bấm "Sửa" thì đổi thành ô soạn ngay tại chỗ. */
export function CommentBody({ commentId, content, createdAt, updatedAt, className }: {
  commentId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  className?: string;
}) {
  const { editing, setEditing } = useEditScope();
  const [state, action, pending] = useActionState<CommentEditState, FormData>(updateComment, {});

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok, setEditing]);

  if (!editing) {
    const edited = updatedAt.getTime() - createdAt.getTime() > EDITED_AFTER_MS;
    return (
      <>
        <ReplyContent content={content} className={className} />
        {edited && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
            <Pencil size={10} /> Đã sửa lúc {format(updatedAt, 'HH:mm · dd/MM/yyyy')}
          </p>
        )}
      </>
    );
  }

  return (
    <ActionForm action={action} className="mt-1 space-y-2">
      <input type="hidden" name="commentId" value={commentId} />
      <MentionTextarea name="content" defaultValue={content} required minLength={2} maxLength={2000}
        autoFocus rows={3} className="input resize-y" />

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
          {pending ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-ink-500 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800">
          <X size={15} /> Huỷ
        </button>
        {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </ActionForm>
  );
}
