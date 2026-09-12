'use client';

import { useState } from 'react';
import { TamXacNhanTai, type TepChon } from '@/components/game/TamXacNhanTai';

/**
 * Nút tải nhỏ ở đầu trang game — nút "Get" của App Store.
 *
 * Cùng một tấm xác nhận với nút tải to bên dưới, và đấy là cả lý do thành phần
 * này tồn tại: trước đó nút đầu trang là một liên kết đi thẳng, nên cùng một
 * trang có hai nút tải cho ra hai luồng khác nhau — một nút hỏi lại, một nút
 * không. Người dùng không đoán được nút nào làm gì thì nhịp xác nhận mất tác
 * dụng, vì nó chỉ còn là chuyện may rủi bấm trúng nút nào.
 *
 * Game nhiều hệ máy thì `tep` để trống: lúc ấy không chọn hộ được, nút chỉ đưa
 * xuống khung chọn bên dưới.
 */
export function NutTaiDau({ tep, dichLui, game, taiKhoan, nhan }: {
  tep: TepChon | null;
  /** Đi đâu khi không có tệp nào chọn sẵn — thường là `#tai`. */
  dichLui: string;
  game: { ten: string; icon: string | null; nhaPhatTrien: string | null; doTuoi: number };
  taiKhoan: string | null;
  nhan: string;
}) {
  const [mo, datMo] = useState(false);

  return (
    <>
      {/*
        TÔ ĐẶC KHI NÚT NÀY LÀ LỐI TẢI THẬT.
        Có tệp chọn sẵn thì bấm là tải — đây là nút "Get" của App Store, và nó
        phải là nút tô đặc duy nhất trên trang. Không có tệp chọn sẵn thì nút
        chỉ đưa xuống khung chọn hệ máy, nên nó là việc phụ và mang dáng nhạt;
        nút tô đặc lúc ấy nằm dưới khung, sau khi đã chọn.
      */}
      <a href={tep ? `/tai/${tep.id}` : dichLui} data-viec="tai-dau"
        className={tep ? 'nut-cai-dam !min-h-[36px] !px-6 !text-[14px]' : 'nut-cai'}
        onClick={(e) => {
          // Không có tệp chọn sẵn thì để liên kết chạy như thường: nó chỉ cuộn
          // xuống khung chọn, chẳng có gì để xác nhận.
          if (!tep) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          datMo(true);
        }}>
        {nhan}
      </a>

      <TamXacNhanTai tep={tep} game={game} taiKhoan={taiKhoan}
        mo={mo} dong={() => datMo(false)} />
    </>
  );
}
