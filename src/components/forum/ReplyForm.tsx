'use client';

import { useEffect, useRef } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { addReply, type ReplyState } from '@/app/(site)/forum/actions';
import { ActionForm } from '@/components/ActionForm';
import { ComposerTools } from '@/components/ComposerTools';
import { MentionTextarea } from '@/components/MentionTextarea';

export function ReplyForm({ threadId, parentId, loggedIn, callbackUrl, compact, autoFocus, onDone }: {
  threadId: string; parentId?: string; loggedIn: boolean; callbackUrl: string;
  compact?: boolean; autoFocus?: boolean; onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(addReply, {});
  const ref = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      onDone?.();
    }
  }, [state.ok, onDone]);

  if (!loggedIn) {
    return (
      <div className="card p-4 text-center text-sm text-ink-500">
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
        {' '}để tham gia trả lời.
      </div>
    );
  }

  return (
    <ActionForm ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <MentionTextarea ref={taRef} name="content" required minLength={2} maxLength={5000} autoFocus={autoFocus}
        rows={compact ? 2 : 3} placeholder={parentId ? 'Viết phản hồi…' : 'Viết trả lời của bạn… gõ @ để nhắc tên'}
        className="input resize-y" />

      <ComposerTools textareaRef={taRef}>
        <span className="min-w-0 flex-1 truncate text-xs">
          {state.error && <span className="text-red-600">{state.error}</span>}
          {state.ok && <span className="text-green-600">Đã gửi trả lời.</span>}
        </span>
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 disabled:opacity-60">
          <Send size={15} /> {pending ? 'Đang gửi…' : 'Gửi'}
        </button>
      </ComposerTools>
    </ActionForm>
  );
}
