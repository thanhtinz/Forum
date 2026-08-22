'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Ô nhập ảnh dùng chung: dán link hoặc bấm "Tải ảnh lên" để đẩy ảnh qua
 * /api/upload rồi tự điền đường dẫn. Vẫn gửi kèm form dưới dạng input text
 * nên các server action hiện có không phải sửa gì.
 */
export function ImageField({
  name,
  label,
  defaultValue,
  placeholder = 'https://… hoặc bấm Tải ảnh lên',
  hint,
  required = false,
  shape = 'wide',
  error,
  className,
  onChange,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: ReactNode;
  required?: boolean;
  /** Khung xem trước: 'wide' cho ảnh bìa/banner, 'square' cho logo/avatar. */
  shape?: 'wide' | 'square';
  error?: string;
  className?: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (v: string) => { setUrl(v); onChange?.(v); };

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setUploadError(j.error ?? 'Tải ảnh thất bại.'); return; }
      set(j.url);
    } catch {
      setUploadError('Không tải được ảnh, vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <div className="flex items-start gap-3">
        <span className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 text-ink-300 dark:border-ink-700 dark:bg-ink-800',
          shape === 'wide' ? 'h-12 w-20' : 'size-12',
        )}>
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt="" className="size-full object-cover" />
            : <ImagePlus size={16} />}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <input name={name} required={required} value={url} onChange={(e) => set(e.target.value)}
            className="input" placeholder={placeholder} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className={cn('btn-ghost !py-1 text-xs', uploading && 'opacity-60')}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên'}
            </button>
            {url && <button type="button" onClick={() => set('')} className="btn-ghost !py-1 text-xs"><X size={14} /> Xoá ảnh</button>}
            <span className="text-xs text-ink-400">{hint ?? 'Ảnh JPG, PNG, GIF hoặc WebP, tối đa 5MB.'}</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          {(uploadError || error) && <p className="text-xs text-red-600">{uploadError ?? error}</p>}
        </div>
      </div>
    </div>
  );
}
