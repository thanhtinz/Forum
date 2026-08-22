'use client';

import { useState, type ReactNode } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { isImageIcon } from '@/lib/icon';
import { cn } from '@/lib/utils';
import { useImageUpload } from '@/components/useImageUpload';

/**
 * Ô nhập biểu tượng dùng chung cho admin: gõ emoji, dán link ảnh, kéo–thả ảnh,
 * dán ảnh từ clipboard hoặc bấm "Tải ảnh lên" (qua /api/upload).
 */
export function IconField({
  name = 'icon',
  label = 'Biểu tượng',
  defaultValue,
  placeholder = '⭐ hoặc dán link ảnh',
  hint,
  color,
  fallback,
  className,
  onChange,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: ReactNode;
  /** Màu nền ô xem trước (theo màu cấp/huy chương đang chọn). */
  color?: string | null;
  /** Hiện khi chưa có biểu tượng nào. */
  fallback?: ReactNode;
  className?: string;
  onChange?: (icon: string) => void;
}) {
  const [icon, setIcon] = useState(defaultValue ?? '');
  const set = (v: string) => { setIcon(v); onChange?.(v); };
  const { upload, uploading, error, dragging, dropProps, onPaste, fileRef } = useImageUpload(set);

  return (
    <div className={className}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <div {...dropProps}
        className={cn('flex items-start gap-3 rounded-xl transition-colors',
          dragging && 'bg-brand-50 ring-2 ring-dashed ring-brand-400 dark:bg-brand-950/30')}>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl text-lg"
          style={{ backgroundColor: (color ?? '#e5e7eb') + '33', color: color ?? '#6b7280' }}>
          {isImageIcon(icon)
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={icon} alt="" className="size-full object-contain" />
            : (icon || fallback)}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <input name={name} value={icon} onPaste={onPaste} onChange={(e) => set(e.target.value)}
            className="input" placeholder={placeholder} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className={cn('btn-ghost !py-1 text-xs', uploading && 'opacity-60')}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên'}
            </button>
            {isImageIcon(icon) && (
              <button type="button" onClick={() => set('')} className="btn-ghost !py-1 text-xs"><X size={14} /> Bỏ ảnh</button>
            )}
            <span className="text-xs text-ink-400">{hint ?? 'Kéo ảnh vào đây, dán từ clipboard hoặc chọn tệp — tối đa 5MB.'}</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
