'use server';

import { db } from '@/lib/db';
import { bamMatKhau } from '@/lib/xac-thuc';
import { danhDauDaDung, traMa } from '@/lib/dat-lai';
import { MAT_KHAU_TOI_DA, MAT_KHAU_TOI_THIEU } from '@/lib/luat-tai-khoan-const';

export interface KetQuaDatLai { loi?: string; ok?: boolean }

/**
 * Đổi mật khẩu bằng một mã đặt lại.
 *
 * MỘT CÂU BÁO LỖI DUY NHẤT cho mọi kiểu mã hỏng — sai, đã dùng, hết hạn. Nói
 * riêng "mã này đã dùng rồi" là xác nhận với người cầm mã rằng mã ấy từng có
 * thật và thuộc về ai đó; ở đây chẳng được gì mà lộ thêm một mẩu.
 *
 * KHÔNG CHẶN SỐ LẦN THỬ, và đó là chủ ý chứ không phải quên: mã gồm 32 byte
 * ngẫu nhiên, tức là chừng 2^256 khả năng. Dò mò không phải một lối tấn công
 * ở đây, mà thêm cửa chặn thì lại đẻ ra một lối mới — ai cũng khoá được cửa
 * đặt lại của cả trang bằng cách bắn bừa vài chục lượt.
 */
export async function datLaiMatKhau(
  _truoc: KetQuaDatLai, form: FormData,
): Promise<KetQuaDatLai> {
  const ma = String(form.get('ma') ?? '');
  const matKhau = String(form.get('matKhau') ?? '');
  const nhacLai = String(form.get('nhacLai') ?? '');

  if (matKhau.length < MAT_KHAU_TOI_THIEU) return { loi: `Mật khẩu mới cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.` };
  if (matKhau.length > MAT_KHAU_TOI_DA) return { loi: 'Mật khẩu dài quá.' };
  if (matKhau !== nhacLai) return { loi: 'Hai ô mật khẩu chưa giống nhau.' };

  const hang = await traMa(ma);
  if (!hang) return { loi: 'Mã không dùng được. Xin ban quản trị phát lại mã khác nhé.' };

  /*
   * ĐÁNH DẤU ĐÃ DÙNG TRƯỚC KHI ĐỔI MẬT KHẨU.
   *
   * Thứ tự này không đảo được. Đổi trước rồi mới đánh dấu thì hai lượt gửi
   * cùng lúc đều đổi được, và mật khẩu cuối cùng là của lượt nào về sau — tức
   * là một cái mã dùng được hai lần, mỗi lần một mật khẩu khác nhau.
   */
  if (!(await danhDauDaDung(hang.id))) {
    return { loi: 'Mã không dùng được. Xin ban quản trị phát lại mã khác nhé.' };
  }

  const bam = await bamMatKhau(matKhau);

  await db.$transaction(async (tx) => {
    await tx.nguoiDung.update({
      where: { id: hang.nguoiId },
      data: { matKhauBam: bam },
      select: { id: true },
    });

    /*
     * ĐÓNG SẠCH MỌI PHIÊN CỦA NGƯỜI ẤY.
     *
     * Người ta đặt lại mật khẩu thường vì nghi có kẻ khác đang vào được tài
     * khoản — mà kẻ ấy giữ cookie phiên chứ có cần biết mật khẩu đâu. Không
     * đóng thì đổi mật khẩu xong kẻ kia vẫn ngồi nguyên trong đó.
     *
     * Đóng HẾT chứ không chừa cái nào, khác lối `dongPhienKhac` lúc tự đổi mật
     * khẩu: ở đây người đổi đang là khách chưa đăng nhập, không có phiên nào
     * của họ để mà chừa.
     */
    await tx.phien.deleteMany({ where: { nguoiId: hang.nguoiId } });

    // Mấy mã chưa dùng khác cũng chết theo: đổi xong rồi thì không còn lý do
    // nào để một cái chìa cũ vẫn mở được cửa.
    await tx.maDatLai.deleteMany({ where: { nguoiId: hang.nguoiId, dungLuc: null } });
  });

  return { ok: true };
}
