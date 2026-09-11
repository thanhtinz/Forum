'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  bamMatKhau, batBuocDangNhap, dongPhienKhac, khopMatKhau,
} from '@/lib/xac-thuc';

export interface KetQua { ok?: string; loi?: string }

function chu(form: FormData, ten: string): string {
  return String(form.get(ten) ?? '').trim();
}

/**
 * Đổi tên hiển thị và ảnh đại diện.
 *
 * KHÔNG cho đổi tên đăng nhập và email. Tên đăng nhập nằm trong mọi bài viết
 * cũ của người ấy trên diễn đàn, còn email là thứ duy nhất dùng để nhận ra một
 * tài khoản — đổi được cả hai thì một tài khoản có thể hoá trang thành tài
 * khoản khác, và người đọc diễn đàn không còn lần được ai là ai.
 */
export async function luuHoSo(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const tenHienThi = chu(form, 'tenHienThi');
  if (tenHienThi.length < 2) return { loi: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (tenHienThi.length > 40) return { loi: 'Tên hiển thị dài quá 40 ký tự.' };

  const anh = chu(form, 'anh');
  // Chỉ nhận ảnh qua https hoặc ảnh trong nhà. Bỏ ngỏ thì một địa chỉ
  // `javascript:` hay `data:` lọt thẳng vào thuộc tính src của thẻ ảnh.
  if (anh && !anh.startsWith('https://') && !anh.startsWith('/')) {
    return { loi: 'Địa chỉ ảnh phải bắt đầu bằng “https://” hoặc “/”.' };
  }

  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: { tenHienThi, anh: anh || null },
    select: { id: true },
  });

  revalidatePath('/toi');
  revalidatePath('/toi/cai-dat');
  return { ok: 'Đã lưu hồ sơ.' };
}

/**
 * Đổi mật khẩu.
 *
 * Bắt nhập mật khẩu CŨ, dù người dùng đã đăng nhập rồi. Lý do: một máy bỏ quên
 * ở quán net vẫn đang mở phiên là đủ để người lạ đổi mật khẩu rồi chiếm hẳn
 * tài khoản. Hỏi lại mật khẩu cũ là thứ duy nhất chặn được cú ấy.
 *
 * Đổi xong thì ĐÓNG mọi phiên khác — xem `dongPhienKhac` để biết vì sao.
 */
export async function doiMatKhau(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const cu = chu(form, 'matKhauCu');
  const moi = chu(form, 'matKhauMoi');
  const lai = chu(form, 'matKhauLai');

  if (moi.length < 8) return { loi: 'Mật khẩu mới cần ít nhất 8 ký tự.' };
  if (moi !== lai) return { loi: 'Hai lần gõ mật khẩu mới không khớp.' };
  if (moi === cu) return { loi: 'Mật khẩu mới trùng mật khẩu cũ.' };

  const hang = await db.nguoiDung.findUnique({
    where: { id: nguoi.id }, select: { matKhauBam: true },
  });
  if (!hang || !(await khopMatKhau(cu, hang.matKhauBam))) {
    return { loi: 'Mật khẩu hiện tại không đúng.' };
  }

  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: { matKhauBam: await bamMatKhau(moi) },
    select: { id: true },
  });

  const soDong = await dongPhienKhac(nguoi.id);

  return {
    ok: soDong > 0
      ? `Đã đổi mật khẩu, và đăng xuất ${soDong} thiết bị khác.`
      : 'Đã đổi mật khẩu.',
  };
}
