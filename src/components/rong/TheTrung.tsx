'use client';

import { ANH_TRUNG, GIA_NO_NGAY, moTaConLai } from '@/lib/rong-const';
import type { TrungXem } from '@/lib/rong';
import { cn } from '@/lib/utils';

/**
 * Một quả trứng đang ấp.
 *
 * Tách hẳn khỏi `TheRong`: trứng có đúng MỘT việc là chờ nở, còn rồng đã nở
 * thì có sáu nút. Gộp làm một thẻ "đa năng" thì nửa số nút lúc nào cũng mờ đi,
 * nhìn ra một thẻ hỏng — mà nay hai thứ còn nằm ở hai trang khác nhau.
 */
export function TheTrung({
  t, now, dangLam, onViec,
}: {
  t: TrungXem;
  now: number;
  dangLam: boolean;
  onViec: (viec: 'no', truong: Record<string, string>) => void;
}) {
  const conMs = t.apXongLuc - now;

  return (
    <li className="rong-tam flex flex-col items-center gap-2 p-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ANH_TRUNG} alt="Trứng rồng" className={cn('h-20 w-auto', !t.noDuoc && 'rong-lac')}
        style={{ imageRendering: 'pixelated' }} />
      <p className="text-sm font-bold">Trứng rồng</p>
      <p className="retro-sub text-ink-400">
        {t.noDuoc ? 'Nứt vỏ rồi, nở được!' : `Nở sau ${moTaConLai(conMs)}`}
      </p>
      {t.noDuoc ? (
        <button type="button" disabled={dangLam} onClick={() => onViec('no', { rong: t.id })}
          className="rong-nut w-full px-3 py-2 text-sm disabled:opacity-50">
          Cho nở
        </button>
      ) : (
        <button type="button" disabled={dangLam}
          onClick={() => onViec('no', { rong: t.id, ngay: '1' })}
          className="btn-outline w-full justify-center text-sm disabled:opacity-50">
          Thúc nở ngay · {GIA_NO_NGAY} điểm
        </button>
      )}
    </li>
  );
}
