'use client';

import { useActionState } from 'react';
import { CircleCheckBig, X } from 'lucide-react';
import { datLoiGiai, type KetQua } from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';

/**
 * Nút chọn / bỏ chọn một bài làm lời giải.
 *
 * Chỉ VẼ ra cho người có quyền; chặn thật nằm trong `where` của Prisma ở
 * `datLoiGiai`, vì hàm ấy là một địa chỉ POST công khai.
 *
 * Hai dáng khác hẳn nhau, cố ý: nút CHỌN là một lời mời nhẹ nhàng nằm lẫn với
 * mấy lối phụ, còn nút BỎ thì đứng ngay cạnh dấu lời giải để người sửa nhầm
 * gỡ được ngay chỗ họ đang nhìn.
 */
export function NutLoiGiai({ chuDeId, duongDan, traLoiId, dangLa }: {
  chuDeId: string;
  duongDan: string;
  traLoiId: string;
  dangLa: boolean;
}) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(datLoiGiai, {});

  return (
    <form action={gui} className="inline">
      <input type="hidden" name="chuDeId" value={chuDeId} />
      <input type="hidden" name="duongDan" value={duongDan} />
      <input type="hidden" name="traLoiId" value={traLoiId} />
      {dangLa && <input type="hidden" name="bo" value="1" />}

      <button type="submit" disabled={dangChay}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-mo hover:text-nhan disabled:opacity-50">
        {dangLa
          ? <><X size={13} aria-hidden /> Bỏ đánh dấu lời giải</>
          : <><CircleCheckBig size={13} aria-hidden /> Chọn làm lời giải</>}
      </button>

      {kq.loi && <span role="alert" className="ml-2 text-[12px] text-xau">{kq.loi}</span>}
    </form>
  );
}
