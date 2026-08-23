'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Send, ImagePlus, Loader2 } from 'lucide-react';
import { addReply, type ReplyState } from '@/app/(site)/forum/actions';
import { MediaPicker } from './MediaPicker';
import { ActionForm } from '@/components/ActionForm';
import { MentionTextarea } from '@/components/MentionTextarea';

export function ReplyForm({ threadId, parentId, loggedIn, callbackUrl, compact, autoFocus, onDone }: {
  threadId: string; parentId?: string; loggedIn: boolean; callbackUrl: string;
  compact?: boolean; autoFocus?: boolean; onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(addReply, {});
  const ref = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      onDone?.();
    }
  }, [state.ok, onDone]);

  /** Chèn văn bản vào đúng vị trí con trỏ trong ô soạn. */
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

      <div className="flex flex-wrap items-center gap-2">
        {/* Công cụ soạn thảo */}
        <MediaPicker onPickText={insert} onPickImage={insertImage} />

        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          title="Gửi ảnh"
          className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-800">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

        <span className="min-w-0 flex-1 truncate text-xs">
          {uploadError && <span className="text-red-600">{uploadError}</span>}
          {!uploadError && state.error && <span className="text-red-600">{state.error}</span>}
          {!uploadError && state.ok && <span className="text-green-600">Đã gửi trả lời.</span>}
        </span>

        <button type="submit" disabled={pending} className="btn-primary !py-1.5 disabled:opacity-60">
          <Send size={15} /> {pending ? 'Đang gửi…' : 'Gửi'}
        </button>
      </div>
    </ActionForm>
  );
}
