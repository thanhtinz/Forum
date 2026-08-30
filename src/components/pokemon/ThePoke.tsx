'use client';

import { anhHe, anhThu, tenHe } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';

/** Thanh máu — cùng một cái dùng cho cả thú mình lẫn thú hoang. */
export function ThanhMau({ mau, toiDa, nho }: { mau: number; toiDa: number; nho?: boolean }) {
  const ti = toiDa > 0 ? Math.max(0, Math.min(1, mau / toiDa)) : 0;
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700', nho ? 'h-1.5' : 'h-2.5')}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500',
          ti > 0.5 ? 'bg-emerald-500' : ti > 0.2 ? 'bg-amber-500' : 'bg-rose-500')}
        style={{ width: `${ti * 100}%` }} />
    </div>
  );
}

/** Huy hiệu hệ — chính tấm ảnh của bản cũ, không vẽ lại. */
export function HuyHieuHe({ he, className }: { he: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={anhHe(he)} alt={tenHe(he)} title={tenHe(he)}
      className={cn('h-4 w-auto', className)} style={{ imageRendering: 'pixelated' }} />
  );
}

/** Ảnh một con thú, phóng to theo bội số nguyên cho khỏi nhoè nét. */
export function AnhThu({ nguon, nac = 1, className, lat }: {
  nguon: number; nac?: number; className?: string; lat?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={anhThu(nguon, nac)} alt="" aria-hidden
      className={cn('object-contain', lat && '-scale-x-100', className)}
      style={{ imageRendering: 'pixelated' }} />
  );
}
