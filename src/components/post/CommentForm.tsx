'use client';

import { useEffect, useRef } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { addComment, type CommentState } from '@/app/(site)/comments/actions';
import { ActionForm } from '@/components/ActionForm';
import { ComposerTools } from '@/components/ComposerTools';
import { MentionTextarea } from '@/components/MentionTextarea';

export function CommentForm({ gameId, slug, parentId, loggedIn, callbackUrl, compact, autoFocus, defaultValue, onDone }: {
  /** Bình luận gắn vào bài viết hoặc game — truyền đúng một trong hai. */
  gameId: string;
  slug: string; parentId?: string; loggedIn: boolean; callbackUrl: string; compact?: boolean;
  autoFocus?: boolean;
  /** Nội dung gợi sẵn — dùng để chèn @tên người đang được phản hồi. */
  defaultValue?: string;
  /** Gửi xong thì nơi gọi tự đóng ô soạn phản hồi. */
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment, {});
  const ref = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    ref.current?.reset();
    onDone?.();
  }, [state.ok, onDone]);

  if (!loggedIn) {
    return (
      <div className="card p-4 text-center text-sm text-ink-500">
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
        {' '}để tham gia bình luận.
      </div>
    );
  }

  return (
    <ActionForm ref={ref} action={action} className="space-y-2">
      {gameId && <input type="hidden" name="gameId" value={gameId} />}
      <input type="hidden" name="slug" value={slug} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <MentionTextarea ref={taRef} name="content" required minLength={2} maxLength={2000}
        autoFocus={autoFocus} defaultValue={defaultValue} rows={compact ? 2 : 3} placeholder={parentId ? 'Viết phản hồi…' : 'Viết bình luận của bạn… gõ @ để nhắc tên'}
        className="input resize-y" />

      <ComposerTools textareaRef={taRef}>
        <span className="min-w-0 flex-1 truncate text-xs">
          {state.error && <span className="text-red-600">{state.error}</span>}
          {state.ok && <span className="text-green-600">Đã gửi bình luận.</span>}
        </span>
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 disabled:opacity-60">
          <Send size={15} /> {pending ? 'Đang gửi…' : 'Gửi'}
        </button>
      </ComposerTools>
    </ActionForm>
  );
}
