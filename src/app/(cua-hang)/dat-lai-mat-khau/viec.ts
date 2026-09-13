'use server';

import { db } from '@/lib/db';
import { bamMatKhau } from '@/lib/xac-thuc';
import { danhDauDaDung, traMa } from '@/lib/ma-xac-minh';
import { TOI_DA_SAI } from '@/lib/ma-xac-minh-const';
import { MAT_KHAU_TOI_DA, MAT_KHAU_TOI_THIEU } from '@/lib/luat-tai-khoan-const';

export interface KetQuaDatLai { loi?: string; ok?: boolean }

const MA_HONG = 'Mã không đúng hoặc đã hết hạn.';

/**
 * Đổi mật khẩu bằng mã sáu số gửi tới email.
 *
 * MỘT CÂU BÁO LỖI DUY NHẤT cho mọi kiểu mã hỏng — sai, đã dùng, hết hạn. Nói
 * riêng "mã này đã dùng rồi" là xác nhận với người cầm mã rằng mã ấy từng có
 * thật và thuộc về ai đó.
 *
 * Chỗ duy nhất nói thêm là lúc HẾT LƯỢT THỬ, vì im lặng ở đó thì người dùng
 * ngồi gõ lại mãi một mã đã chết. Nói ra cũng chẳng lộ gì: kẻ dò mã chính là
 * người vừa làm nó chết.
 */
export async function datLaiMatKhau(
  _truoc: KetQuaDatLai, form: FormData,
): Promise<KetQuaDatLai> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const ma = String(form.get('ma') ?? '');
  const matKhau = String(form.get('matKhau') ?? '');
  const nhacLai = String(form.get('nhacLai') ?? '');

  if (!email) return { loi: 'Hãy nhập địa chỉ email của tài khoản.' };
  if (matKhau.length < MAT_KHAU_TOI_THIEU) {
    return { loi: `Mật khẩu mới cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.` };
  }
  if (matKhau.length > MAT_KHAU_TOI_DA) return { loi: 'Mật khẩu dài quá.' };
  if (matKhau !== nhacLai) return { loi: 'Hai ô mật khẩu chưa giống nhau.' };

  const tra = await traMa('DAT_LAI', email, ma);
  if (!tra.ok) {
    return {
      loi: tra.hetSuc
        ? `Gõ sai quá ${TOI_DA_SAI} lần nên mã này đã khoá. Xin một mã mới nhé.`
        : MA_HONG,
    };
  }
  if (!tra.hang.nguoiId) return { loi: MA_HONG };
  const nguoiId = tra.hang.nguoiId;

  /*
   * ĐÁNH DẤU ĐÃ DÙNG TRƯỚC KHI ĐỔI MẬT KHẨU.
   *
   * Thứ tự này không đảo được. Đổi trước rồi mới đánh dấu thì hai lượt gửi
   * cùng lúc đều đổi được, và mật khẩu cuối cùng là của lượt nào về sau — tức
   * là một cái mã dùng được hai lần, mỗi lần một mật khẩu khác nhau.
   */
  if (!(await danhDauDaDung(tra.hang.id))) return { loi: MA_HONG };

  const bam = await bamMatKhau(matKhau);

  await db.$transaction(async (tx) => {
    await tx.nguoiDung.update({
      where: { id: nguoiId },
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
    await tx.phien.deleteMany({ where: { nguoiId } });

    // Mấy mã chưa dùng khác cũng chết theo: đổi xong rồi thì không còn lý do
    // nào để một cái chìa cũ vẫn mở được cửa.
    await tx.maXacMinh.deleteMany({ where: { nguoiId, viec: 'DAT_LAI', dungLuc: null } });
  });

  return { ok: true };
}
