'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';

export interface KetQuaDon { loi?: string; ok?: boolean }

const TEN_TOI_DA = 60;
const LY_DO_TOI_THIEU = 30;

/**
 * Gửi đơn xin làm tác giả, hoặc gửi lại sau khi bị trả về.
 *
 * MỖI NGƯỜI MỘT ĐƠN, nên đây là `upsert` chứ không phải `create`: người bị trả
 * lại sửa chính đơn cũ rồi gửi lại, và hàng chờ của ban quản trị không dài ra
 * vì cùng một người gửi ba lần.
 *
 * ĐANG CHỜ XÉT THÌ KHÔNG GỬI ĐÈ. Cho gửi đè thì một người có thể đổi nội dung
 * đơn ngay lúc người xét đang đọc — người xét bấm "đồng ý" cho một câu chữ, mà
 * thứ được lưu lại là câu khác.
 */
export async function guiDonTacGia(_truoc: KetQuaDon, form: FormData): Promise<KetQuaDon> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập trước đã.' };
  if (nguoi.vaiTro !== 'THANH_VIEN') return { loi: 'Tài khoản này đã có quyền đăng game rồi.' };

  const tenTacGia = String(form.get('tenTacGia') ?? '').trim().slice(0, TEN_TOI_DA);
  const gioiThieu = String(form.get('gioiThieu') ?? '').trim().slice(0, 2000);
  const lyDo = String(form.get('lyDo') ?? '').trim().slice(0, 2000);

  if (tenTacGia.length < 2) return { loi: 'Hãy cho biết tên bạn muốn bày ở trang tác giả.' };
  if (lyDo.length < LY_DO_TOI_THIEU) {
    return {
      loi: `Hãy kể rõ hơn bạn định đăng game gì — ít nhất ${LY_DO_TOI_THIEU} ký tự.`
        + ' Đây là thứ ban quản trị đọc để quyết.',
    };
  }

  const dangCo = await db.donTacGia.findUnique({
    where: { nguoiId: nguoi.id }, select: { trangThai: true },
  });
  if (dangCo?.trangThai === 'CHO_XEM') {
    return { loi: 'Đơn của bạn đang chờ xét. Chờ ban quản trị trả lời nhé.' };
  }

  await db.donTacGia.upsert({
    where: { nguoiId: nguoi.id },
    update: { tenTacGia, gioiThieu: gioiThieu || null, lyDo, trangThai: 'CHO_XEM', loiNhan: null, xetLuc: null },
    create: { nguoiId: nguoi.id, tenTacGia, gioiThieu: gioiThieu || null, lyDo },
    select: { id: true },
  });

  revalidatePath('/tac-gia/dang-ky');
  revalidatePath('/quan-tri/tac-gia');
  return { ok: true };
}
