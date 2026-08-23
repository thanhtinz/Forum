'use client';

import { useRef, useState, useEffect, useActionState } from 'react';
import { Send, ImagePlus, Loader2, X, CornerUpLeft } from 'lucide-react';
import { sendMessage, type MessageState } from '@/app/(site)/user/messages/actions';
import { MESSAGE_MAX_LENGTH, messagePreview } from '@/lib/messages';
import { MediaPicker } from '@/components/forum/MediaPicker';
import { ActionForm } from '@/components/ActionForm';
import { useChatReply } from '@/components/user/ChatReplyContext';

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { replyTo, setReplyTo } = useChatReply();

  // Gửi xong mới dọn ô nhập; gửi lỗi thì giữ nguyên để soạn lại.
  useEffect(() => {
    if (!state.ok) return;
    if (taRef.current) taRef.current.value = '';
    setUploadError(null);
    setReplyTo(null);
    taRef.current?.focus();
  }, [state.ok]);

  /** Chèn văn bản vào đúng vị trí con trỏ. */
  const insert = (text: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    const pos = start + text.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
  };

  const insertImage = (url: string, alt: string) => {
    const ta = taRef.current;
    const prefix = ta && ta.value && !ta.value.endsWith('\n') ? '\n' : '';
    insert(`${prefix}![${alt}](${url})\n`);
  };

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setUploadError(j.error ?? 'Tải ảnh thất bại.'); return; }
      insertImage(j.url, file.name);
    } catch {
      setUploadError('Không tải được ảnh, vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <ActionForm action={action}
      className="sticky bottom-0 rounded-2xl border border-ink-200 bg-white p-2.5 shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <input type="hidden" name="conversationId" value={conversationId} />
      {replyTo && <input type="hidden" name="replyToId" value={replyTo.id} />}

      {/* Khối tin đang trả lời, bấm x để bỏ */}
      {replyTo && (
        <div className="mb-1.5 flex items-start gap-2 rounded-xl border-l-2 border-brand-400 bg-brand-50 px-2.5 py-1.5 dark:bg-brand-950/40">
          <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-brand-700 dark:text-brand-300">
              Trả lời {replyTo.author}
            </span>
            <span className="line-clamp-1 text-xs text-ink-500">{messagePreview(replyTo.text)}</span>
          </span>
          <button type="button" onClick={() => setReplyTo(null)} title="Bỏ trả lời"
            className="shrink-0 text-ink-400 hover:text-ink-600"><X size={14} /></button>
        </div>
      )}

      <textarea ref={taRef} name="content" rows={2} maxLength={MESSAGE_MAX_LENGTH}
        placeholder={replyTo ? `Trả lời ${replyTo.author}…` : 'Nhập tin nhắn…'}
        className="w-full resize-y bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-ink-400"
        onKeyDown={(e) => {
          // Enter gửi, Shift/Ctrl + Enter xuống dòng — quen tay như app chat
          if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }} />

      <div className="flex flex-wrap items-center gap-1">
        <MediaPicker onPickText={insert} onPickImage={insertImage} />

        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Gửi ảnh"
          className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-800">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

        <span className="min-w-0 flex-1 truncate px-1 text-xs">
          {uploadError
            ? <span className="text-red-600">{uploadError}</span>
            : state.error
              ? <span className="text-red-600">{state.error}</span>
              : <span className="text-ink-400">Enter để gửi · Shift + Enter xuống dòng</span>}
        </span>

        <button type="submit" disabled={pending}
          className="grid size-9 place-items-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          title="Gửi">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </ActionForm>
  );
}
