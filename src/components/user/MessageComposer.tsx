'use client';

import { useRef, useEffect, useActionState } from 'react';
import { Send } from 'lucide-react';
import { sendMessage, type MessageState } from '@/app/(site)/user/messages/actions';
import { MESSAGE_MAX_LENGTH } from '@/lib/messages';
import { ActionForm } from '@/components/ActionForm';

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Gửi xong mới dọn ô nhập; gửi lỗi thì giữ nguyên để soạn lại.
  useEffect(() => { if (state.ok && boxRef.current) boxRef.current.value = ''; }, [state.ok]);

  return (
    <ActionForm action={action} className="card space-y-2 p-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea ref={boxRef} name="content" rows={3} maxLength={MESSAGE_MAX_LENGTH}
        className="input resize-y" placeholder="Nhập tin nhắn…"
        onKeyDown={(e) => {
          // Ctrl/⌘ + Enter gửi nhanh, Enter thường vẫn xuống dòng
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.form?.requestSubmit();
        }} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <Send size={16} /> {pending ? 'Đang gửi…' : 'Gửi'}
        </button>
        <span className="text-xs text-ink-400">Ctrl + Enter để gửi nhanh</span>
      </div>
    </ActionForm>
  );
}
