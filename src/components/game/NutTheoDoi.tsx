'use client';

import { useActionState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { latTheoDoi, type KetQua } from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';

/**
 * Công tắc theo dõi một chủ đề.
 *
 * Nói rõ TRẠNG THÁI ĐANG CÓ chứ không nói việc sắp làm: nút ghi "Đang theo
 * dõi" khi đang bật, chứ không ghi "Bỏ theo dõi". Nút kiểu sau đọc nhanh thì
 * hiểu ngược — thấy chữ "Bỏ theo dõi" mà tưởng mình chưa theo dõi.
 */
export function NutTheoDoi({ chuDeId, duongDan, dangTheo }: {
  chuDeId: string;
  duongDan: string;
  dangTheo: boolean;
}) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(latTheoDoi, {});

  return (
    <form action={gui} className="inline-flex items-center gap-2">
      <input type="hidden" name="chuDeId" value={chuDeId} />
      <input type="hidden" name="duongDan" value={duongDan} />

      <button type="submit" disabled={dangChay}
        aria-pressed={dangTheo}
        className="nut-xam !min-h-[32px] !px-3 !text-[12px] disabled:opacity-50">
        {dangTheo
          ? <><Bell size={13} aria-hidden /> Đang theo dõi</>
          : <><BellOff size={13} aria-hidden /> Theo dõi</>}
      </button>

      {kq.loi && <span role="alert" className="text-[12px] text-xau">{kq.loi}</span>}
    </form>
  );
}
