import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { isImageIcon } from '@/lib/icon';

/**
 * Hiện một biểu tượng đã cấu hình: ảnh tải lên thì render <img>,
 * còn lại giữ nguyên emoji/chữ, không có gì thì dùng `fallback`.
 */
export function IconGlyph({ icon, fallback = null, className }: {
  icon?: string | null;
  fallback?: ReactNode;
  className?: string;
}) {
  if (isImageIcon(icon)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" className={cn('size-[1em] object-contain', className)} />;
  }
  return <>{icon || fallback}</>;
}
