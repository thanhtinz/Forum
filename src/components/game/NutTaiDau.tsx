'use client';

import { useState } from 'react';
import { CloudDownload } from 'lucide-react';
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
export function NutTaiDau({ tep, dichLui, game, taiKhoan, nhan, daTai }: {
  tep: TepChon | null;
  /** Đi đâu khi không có tệp nào chọn sẵn — thường là `#tai`. */
  dichLui: string;
  game: { ten: string; icon: string | null; nhaPhatTrien: string | null; doTuoi: number };
  taiKhoan: string | null;
  nhan: string;
  /**
   * Người đang xem TỪNG tải game này rồi.
   *
   * Lúc ấy nút đổi hẳn dáng: không còn viên thuốc chữ "Tải về" mà thành một
   * biểu tượng đám mây có mũi tên xuống — đúng thứ App Store bày cho ứng dụng
   * đã tải rồi xoá đi. Nó nói được một câu mà chữ "Tải về" không nói nổi: máy
   * này từng có game ấy, đây là lấy LẠI chứ không phải lấy mới.
   */
  daTai?: boolean;
}) {
  const [mo, datMo] = useState(false);

  return (
    <>
      {/*
        LUÔN TÔ ĐẶC — đây là nút "Get" của App Store.

        Bản trước để nút này nhạt đi khi game có nhiều hệ máy, vì lúc ấy nó chỉ
        đưa xuống khung chọn chứ không tải thẳng, và nút tô đặc nhường cho khung
        ấy. Nhưng từ đợt dựng lại trang, khung tải tụt xuống dưới cả phần mô tả,
        nên nút đầu trang thành thứ DUY NHẤT luôn nằm trong tầm mắt. Trang ứng
        dụng của App Store không bao giờ mở ra mà thiếu một nút xanh ở đầu.

        Vẫn đúng một nút tô đặc trên cả trang: nút trong khung tải nay luôn mang
        dáng viền (xem `nutChinhDam` ở trang Thông tin). Hai nút xanh đặc cách
        nhau một màn hình là mời bấm nhầm.
      */}
      <a href={tep ? `/tai/${tep.id}` : dichLui} data-viec="tai-dau"
        data-da-tai={daTai ? '1' : undefined}
        aria-label={daTai ? `Tải lại ${game.ten}` : undefined}
        title={daTai ? 'Bạn đã tải game này — tải lại' : undefined}
        className={daTai
          ? 'grid size-9 place-items-center rounded-full text-nhan transition-colors hover:bg-nen3'
          : 'nut-cai-dam !min-h-[36px] !px-6 !text-[14px]'}
        onClick={(e) => {
          // Không có tệp chọn sẵn thì để liên kết chạy như thường: nó chỉ cuộn
          // xuống khung chọn, chẳng có gì để xác nhận.
          if (!tep) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          datMo(true);
        }}>
        {daTai ? <CloudDownload size={24} strokeWidth={1.7} aria-hidden /> : nhan}
      </a>

      <TamXacNhanTai tep={tep} game={game} taiKhoan={taiKhoan}
        mo={mo} dong={() => datMo(false)} />
    </>
  );
}
