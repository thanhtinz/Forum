'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2, CornerDownRight } from 'lucide-react';
import { addClubComment, deleteClubComment } from '@/app/(site)/clb/actions';
import { UserName, Avatar } from '@/components/user/Cosmetic';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { ComposerTools } from '@/components/ComposerTools';
import { MentionTextarea } from '@/components/MentionTextarea';
import { CLUB_COMMENT_MAX, type ClubActionState } from '@/lib/club-const';
import { fmtAgo } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export interface ClubCommentNodeView {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  depth: number;
  author: AuthorChip | null;
  children: ClubCommentNodeView[];
}

/**
 * Ô soạn bình luận, dùng cho cả bình luận gốc lẫn trả lời.
 *
 * Cùng bộ công cụ với các ô soạn khác của trang (`ComposerTools`): emoji,
 * sticker, GIF và gửi ảnh. Trước đây ô này là một `<input>` trơ, gõ được mỗi
 * chữ — người quen bên chủ đề sang đây là hụt.
 */
export function ClubCommentBox({ postId, parentId, placeholder, autoFocus, onDone }: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [state, action, sending] = useActionState<ClubActionState, FormData>(addClubComment, {});
  const formRef = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
    onDone?.();
  }, [state, router, onDone]);

  return (
    <form ref={formRef} action={action} className="mt-2 space-y-1.5">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <MentionTextarea ref={taRef} name="content" required maxLength={CLUB_COMMENT_MAX} rows={2}
        autoFocus={autoFocus} className="input resize-y text-sm"
        placeholder={placeholder ?? 'Viết bình luận… gõ @ để nhắc tên'} />
      <ComposerTools textareaRef={taRef}>
        <span className="min-w-0 flex-1 truncate text-xs text-red-600">{state.error}</span>
        <button type="submit" disabled={sending} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
          <Send size={14} /> {sending ? 'Đang gửi…' : 'Gửi'}
        </button>
      </ComposerTools>
    </form>
  );
}

/**
 * Một bình luận và cả nhánh dưới nó.
 *
 * Thụt lề theo tầng, tầng cuối thì thôi thụt thêm — cây bình luận đã chốt trần
 * ba tầng ở máy chủ nên ở đây không phải lo nhánh dài vô tận.
 */
function CommentNode({ c, postId, canReply, canManage, viewerId, onChanged }: {
  c: ClubCommentNodeView;
  postId: string;
  canReply: boolean;
  canManage: boolean;
  viewerId: string | null;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    await deleteClubComment(c.id);
    setBusy(false);
    onChanged();
  };

  return (
    <li>
      <div className="flex items-start gap-2">
        <Avatar image={c.author?.image ?? null} name={c.author?.name ?? c.author?.username ?? '?'}
          cosmetics={c.author?.cosmetics} size={c.depth > 0 ? 22 : 26} />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-ink-50 px-3 py-1.5 dark:bg-ink-800/60">
            <p className="flex flex-wrap items-center gap-x-2 text-xs">
              {c.author && (
                <UserName username={c.author.username} name={c.author.name} role={c.author.role}
                  level={c.author.level} cosmetics={c.author.cosmetics} />
              )}
              <span className="text-ink-400">· {fmtAgo(c.createdAt)}</span>
            </p>
            <ReplyContent content={c.content}
              className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700 dark:text-ink-200" />
          </div>

          <p className="mt-0.5 flex items-center gap-3 pl-1 text-xs text-ink-400">
            {canReply && (
              <button type="button" onClick={() => setReplying((v) => !v)}
                className="font-semibold hover:text-brand-600">
                Trả lời
              </button>
            )}
            {(canManage || c.authorId === viewerId) && (
              <button type="button" onClick={remove} disabled={busy}
                className="flex items-center gap-1 hover:text-red-600 disabled:opacity-50">
                <Trash2 size={12} /> Xoá
              </button>
            )}
          </p>

          {replying && (
            <ClubCommentBox postId={postId} parentId={c.id} autoFocus
              placeholder={`Trả lời ${c.author?.name ?? c.author?.username ?? ''}…`}
              onDone={() => setReplying(false)} />
          )}

          {c.children.length > 0 && (
            <ul className="mt-2 space-y-2 border-l border-ink-100 pl-3 dark:border-ink-800">
              {c.children.map((ch) => (
                <CommentNode key={ch.id} c={ch} postId={postId} canReply={canReply}
                  canManage={canManage} viewerId={viewerId} onChanged={onChanged} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

/** Cả khối bình luận của một bài trên bảng tin. */
export function ClubComments({ postId, comments, canReply, canManage, viewerId, header, footer }: {
  postId: string;
  comments: ClubCommentNodeView[];
  canReply: boolean;
  canManage: boolean;
  viewerId: string | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const onChanged = () => router.refresh();

  return (
    <>
      {(header || comments.length > 0) && (
        <ul className="mt-2 space-y-2.5">
          {header && <li>{header}</li>}
          {comments.map((c) => (
            <CommentNode key={c.id} c={c} postId={postId} canReply={canReply}
              canManage={canManage} viewerId={viewerId} onChanged={onChanged} />
          ))}
          {footer && <li>{footer}</li>}
        </ul>
      )}
      {canReply && (
        <span className="flex items-start gap-2">
          <CornerDownRight size={15} className="mt-3 shrink-0 text-ink-300" />
          <span className="min-w-0 flex-1"><ClubCommentBox postId={postId} /></span>
        </span>
      )}
    </>
  );
}
