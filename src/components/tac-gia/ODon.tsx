'use client';

import { useActionState, useState } from 'react';
import { Clock, TriangleAlert } from 'lucide-react';
import { guiDonTacGia, type KetQuaDon } from '@/app/(cua-hang)/tac-gia/dang-ky/viec';

export interface DonXem {
  trangThai: string;
  tenTacGia: string;
  gioiThieu: string | null;
  lyDo: string;
  loiNhan: string | null;
}

/**
 * Ô gửi đơn xin làm tác giả — và cũng là chỗ xem đơn đang tới đâu.
 *
 * Ba trạng thái, ba khuôn mặt khác hẳn nhau:
 *
 *   • CHƯA GỬI → biểu mẫu trắng.
 *   • ĐANG CHỜ → không có biểu mẫu nữa, chỉ một dòng nói rõ đang chờ. Bày lại
 *     biểu mẫu lúc ấy là mời người ta gửi đè, mà gửi đè thì người xét có thể
 *     đang đọc một câu chữ rồi bấm đồng ý cho một câu khác.
 *   • BỊ TRẢ LẠI → lời nhắn của ban quản trị in TRƯỚC biểu mẫu, và biểu mẫu
 *     giữ nguyên chữ cũ để sửa. Bắt gõ lại từ đầu sau khi bị trả lại là hình
 *     phạt, không phải quy trình.
 */
export function ODon({ don }: { don: DonXem | null }) {
  const [kq, gui, dangChay] = useActionState<KetQuaDon, FormData>(guiDonTacGia, {});

  /*
   * BA Ô CÓ ĐIỀU KHIỂN, không phải `defaultValue`.
   *
   * React 19 tự xoá trắng một biểu mẫu sau khi hành động của nó chạy xong — kể
   * cả khi hành động ấy TRẢ VỀ LỖI. Với ô `defaultValue` thì "xoá trắng" nghĩa
   * là quay về giá trị mặc định, mà ở đây mặc định là rỗng: gõ thiếu mấy chữ ở
   * ô lý do, bị trả về một câu nhắc, rồi ngẩng lên thì cả ô tên lẫn ô giới
   * thiệu đã trắng bong.
   *
   * Bài kiểm 48 bắt được đúng chỗ này: lượt gửi thứ hai hỏng vì ô tên đã bị
   * xoá sau lượt đầu, dù người dùng không hề đụng vào nó.
   */
  const [tenTacGia, datTenTacGia] = useState(don?.tenTacGia ?? '');
  const [gioiThieu, datGioiThieu] = useState(don?.gioiThieu ?? '');
  const [lyDo, datLyDo] = useState(don?.lyDo ?? '');

  if (don?.trangThai === 'CHO_XEM' || kq.ok) {
    return (
      <div className="the flex items-start gap-3 p-4">
        <Clock size={18} className="mt-0.5 shrink-0 text-nhan" aria-hidden />
        <div>
          <p className="text-[14px] font-semibold">Đơn của bạn đang chờ xét</p>
          <p className="phu mt-1">
            Ban quản trị sẽ đọc rồi trả lời. Đồng ý hay trả lại, bạn đều nhận được
            thông báo ngay trong cửa hàng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={gui} className="the space-y-3 p-4">
      <p className="text-[14px] font-bold">
        {don?.trangThai === 'TU_CHOI' ? 'Sửa đơn rồi gửi lại' : 'Gửi đơn xin làm tác giả'}
      </p>

      {don?.trangThai === 'TU_CHOI' && (
        <p className="flex items-start gap-2 rounded-nut bg-canh/10 px-3 py-2 text-[13px] text-chu">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-canh" aria-hidden />
          <span>
            <span className="font-semibold">Ban quản trị trả lại đơn: </span>
            {don.loiNhan ?? 'Không ghi lý do.'}
          </span>
        </p>
      )}

      <label className="block">
        <span className="phu mb-1 block">Tên bày ở trang tác giả</span>
        <input name="tenTacGia" required maxLength={60}
          value={tenTacGia} onChange={(e) => datTenTacGia(e.target.value)}
          placeholder="Tên nhóm, hoặc tên bạn muốn người chơi thấy" className="o-nhap" />
      </label>

      <label className="block">
        <span className="phu mb-1 block">Giới thiệu (không bắt buộc)</span>
        <textarea name="gioiThieu" rows={3} maxLength={2000}
          value={gioiThieu} onChange={(e) => datGioiThieu(e.target.value)}
          placeholder="Vài dòng về bạn, in ở trang tác giả." className="o-nhap" />
      </label>

      <label className="block">
        <span className="phu mb-1 block">Bạn định đăng game gì?</span>
        <textarea name="lyDo" required rows={4} maxLength={2000}
          value={lyDo} onChange={(e) => datLyDo(e.target.value)}
          placeholder="Game tự làm hay game sưu tầm, chạy trên hệ máy nào, có bao nhiêu bản…"
          className="o-nhap" />
        <span className="phu mt-1 block">
          Đây là thứ ban quản trị đọc để quyết, nên càng rõ càng nhanh.
        </span>
      </label>

      {kq.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {kq.loi}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam w-full">
        {dangChay ? 'Đang gửi…' : 'Gửi đơn'}
      </button>
    </form>
  );
}
