'use server';

import { db } from '@/lib/db';
import { conDuocXinMa, ghiLanXinMa } from '@/lib/chan-do-mat-khau';
import { phatMa } from '@/lib/dat-lai';
import { HAN_MA_GIO, chiaCum } from '@/lib/dat-lai-const';
import { guiThu, thuBat } from '@/lib/gui-thu';
import { DIA_CHI_GOC } from '@/lib/dia-chi-goc';
import { EMAIL_TOI_DA } from '@/lib/luat-tai-khoan-const';

export interface KetQuaXinMa { loi?: string; daGui?: boolean }

export async function xinMaDatLai(
  _truoc: KetQuaXinMa, form: FormData,
): Promise<KetQuaXinMa> {
  if (!thuBat()) {
    return { loi: 'Cửa hàng đang chưa gửi được thư. Xin mã trực tiếp từ ban quản trị nhé.' };
  }

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!email || email.length > EMAIL_TOI_DA) return { loi: 'Hãy nhập địa chỉ email.' };

  /*
   * HỎI CỬA CHẶN TRƯỚC KHI CHẠM VÀO CƠ SỞ DỮ LIỆU.
   *
   * Đặt trước vì việc tốn kém ở đây không phải câu truy vấn mà là LÁ THƯ: để
   * kẻ bắn kịch bản gọi tới chỗ gửi thì mỗi lượt của họ là một lá thư thật đi
   * ra khỏi máy chủ ta, và tên miền của cửa hàng lãnh đủ.
   */
  const cua = await conDuocXinMa(email);
  if (cua.chan) {
    return { loi: `Chỗ này vừa xin quá nhiều lần. Thử lại sau ${cua.conPhut} phút.` };
  }
  await ghiLanXinMa(email);

  /*
   * Tài khoản đang KHOÁ thì không phát mã, y như lối ban quản trị phát tay:
   * đặt lại mật khẩu cho người không đăng nhập được là việc vô nghĩa. Nhưng
   * câu trả lời vẫn giữ nguyên một kiểu — không nói ra là họ đang bị khoá.
   */
  const nguoi = await db.nguoiDung.findFirst({
    where: { email, khoa: false },
    select: { id: true, tenHienThi: true },
  });
  if (!nguoi) return { daGui: true };

  const ma = chiaCum(await phatMa(nguoi.id));
  const duongDan = `${DIA_CHI_GOC}/dat-lai-mat-khau?ma=${encodeURIComponent(ma)}`;

  const kq = await guiThu({
    toi: email,
    tieuDe: 'Đặt lại mật khẩu SunnyStore',
    /*
     * Thư chữ trần, không HTML.
     *
     * Một lá thư chỉ có đúng một việc — đưa cái đường dẫn — thì dựng bản HTML
     * là tự thêm cho mình một thứ phải bảo trì, mà đổi lại chẳng được gì.
     * Chưa kể thư chữ trần thì hòm thư nào cũng đọc được và ít bị coi là rác
     * hơn hẳn.
     */
    chu: [
      `Chào ${nguoi.tenHienThi},`,
      '',
      'Có người vừa xin đặt lại mật khẩu cho tài khoản SunnyStore của bạn.',
      'Mở đường dẫn dưới đây rồi chọn mật khẩu mới:',
      '',
      duongDan,
      '',
      `Đường dẫn này dùng được một lần và hết hạn sau ${HAN_MA_GIO} giờ.`,
      '',
      'Nếu không phải bạn xin thì bỏ qua thư này — mật khẩu cũ vẫn nguyên,',
      'và không ai đổi được gì nếu không cầm đường dẫn trên.',
      '',
      'SunnyStore',
    ].join('\n'),
  });

  /*
   * Gửi hỏng thì NÓI THẲNG là hỏng.
   *
   * Đây là chỗ duy nhất câu trả lời được phép khác nhau, và nó không rò rỉ gì:
   * máy chủ thư không nhận là chuyện của ta, không phải chuyện email kia có
   * tài khoản hay không. Im lặng ở đây thì người dùng ngồi đợi mãi một lá thư
   * đã chết ngay lúc rời máy chủ.
   */
  if (!kq.ok) {
    return { loi: 'Gửi thư không thành. Thử lại sau, hoặc xin mã trực tiếp từ ban quản trị.' };
  }

  return { daGui: true };
}
