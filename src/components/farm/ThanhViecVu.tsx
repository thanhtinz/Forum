'use client';

import { Check } from 'lucide-react';
import { VIEC_VU, VIEC_TEN, type TinhTrangViec, type ViecVu } from '@/lib/farm-const';
import { cn } from '@/lib/utils';

/**
 * Năm việc của một vụ, bày thành một dải theo đúng thứ tự làm.
 *
 * Việc đã xong đánh dấu tích, việc đang tới lượt sáng lên, việc chưa tới thì
 * mờ và không bấm được. Bày cả năm việc kể cả việc chưa tới — giấu đi thì
 * người chơi không biết vụ này còn những gì phía trước, mà đó chính là thứ
 * dải này sinh ra để nói.
 *
 * Cuộn ngang ở khổ hẹp: năm nút mà ép vừa 390px thì chữ bé tới mức không đọc
 * nổi, còn cho xuống dòng thì mất luôn cảm giác một dây việc nối tiếp nhau.
 */
export function ThanhViecVu({ tinhTrang, dangLam, onViec }: {
  tinhTrang: Record<ViecVu, TinhTrangViec>;
  dangLam: boolean;
  onViec: (v: ViecVu) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex items-stretch gap-1 overflow-x-auto px-1">
      {VIEC_VU.map((v, i) => {
        const t = tinhTrang[v];
        const bamDuoc = t === 'toi-luot' && !dangLam;
        return (
          <div key={v} className="flex shrink-0 items-center gap-1">
            {i > 0 && <span aria-hidden className="text-ink-300 dark:text-ink-600">›</span>}
            <button
              type="button"
              disabled={!bamDuoc}
              onClick={() => onViec(v)}
              aria-current={t === 'toi-luot' ? 'step' : undefined}
              title={
                t === 'xong' ? `${VIEC_TEN[v]} — xong rồi`
                  : t === 'toi-luot' ? VIEC_TEN[v]
                  : `${VIEC_TEN[v]} — chưa tới lượt`
              }
              aria-label={
                t === 'xong' ? `${VIEC_TEN[v]}, đã xong`
                  : t === 'toi-luot' ? `${VIEC_TEN[v]}, đang tới lượt`
                  : `${VIEC_TEN[v]}, chưa tới lượt`
              }
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors',
                t === 'toi-luot'
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                  : t === 'xong'
                    ? 'border-[var(--nova-border)] bg-[var(--nova-surface)] text-ink-400'
                    : 'cursor-not-allowed border-dashed border-[var(--nova-border)] text-ink-300 dark:text-ink-600',
              )}
            >
              {t === 'xong' && <Check size={12} aria-hidden />}
              {VIEC_TEN[v]}
            </button>
          </div>
        );
      })}
    </div>
  );
}
