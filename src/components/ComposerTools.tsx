'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { MediaPicker } from '@/components/forum/MediaPicker';

/**
 * Hàng công cụ soạn thảo: emoji / sticker / GIF và nút gửi ảnh.
 *
 * Ba ô soạn của trang (trả lời chủ đề, bình luận game, bảng tin câu lạc bộ)
 * cần đúng một bộ công cụ này. Trước đây phần chèn-tại-con-trỏ và phần tải
 * ảnh được chép tay ở từng chỗ, nên ô bình luận bị bỏ quên — gom về một chỗ
 * để lần sau thêm ô soạn mới là có sẵn.
 */
export function ComposerTools({ textareaRef, children }: {
  /** Ô soạn để chèn nội dung vào đúng vị trí con trỏ. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Phần bên phải hàng công cụ: thông báo lỗi, nút gửi… */
  children?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Chèn văn bản vào đúng vị trí con trỏ, không nối bừa vào cuối. */
  const insert = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    const pos = start + text.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
  };

  /** Sticker, GIF và ảnh tải lên đều vào ô soạn dưới dạng `![tên](đường-dẫn)`. */
  const insertImage = (url: string, alt: string) => {
    const ta = textareaRef.current;
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
    <div className="flex flex-wrap items-center gap-2">
      <MediaPicker onPickText={insert} onPickImage={insertImage} />

      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Gửi ảnh"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-800">
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      {uploadError && <span className="min-w-0 flex-1 truncate text-xs text-red-600">{uploadError}</span>}
      {!uploadError && children}
    </div>
  );
}
