'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { bamMatKhau, donPhienCu, dongPhien, khopMatKhau, moPhien } from '@/lib/xac-thuc';
import { thanhDuongDan } from '@/lib/tien-ich';

export interface KetQuaXacThuc { loi?: string }

/*
 * Một câu báo lỗi DUY NHẤT cho mọi kiểu sai.
 *
 * Nói riêng "không có tài khoản này" thì bất kỳ ai cũng dò được email nào đã
 * đăng ký ở đây, chỉ bằng cách gõ thử. Nhập nhằng một chút ở đây đổi lại người
 * dùng khỏi bị lộ là họ có mặt trên trang này.
 */
const SAI = 'Tên đăng nhập hoặc mật khẩu không đúng.';

export async function dangNhap(_truoc: KetQuaXacThuc, form: FormData): Promise<KetQuaXacThuc> {
  const dinhDanh = String(form.get('dinhDanh') ?? '').trim().toLowerCase();
  const matKhau = String(form.get('matKhau') ?? '');
  if (!dinhDanh || !matKhau) return { loi: 'Hãy nhập đủ hai ô.' };

  const nguoi = await db.nguoiDung.findFirst({
    where: { OR: [{ email: dinhDanh }, { tenDangNhap: dinhDanh }] },
    select: { id: true, matKhauBam: true, khoa: true },
  });

  /*
   * Vẫn so mật khẩu kể cả khi không có tài khoản.
   *
   * Trả về ngay thì lần gõ email không tồn tại xong sau vài mili giây, còn lần
   * gõ email có thật phải chờ bcrypt chạy cả trăm mili giây — chênh lệch ấy
   * bấm đồng hồ là đo được, và thành ra vẫn dò được ai đã đăng ký.
   */
  const bamGia = '$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890';
  const dung = await khopMatKhau(matKhau, nguoi?.matKhauBam ?? bamGia);

  if (!nguoi || !dung) return { loi: SAI };
  if (nguoi.khoa) return { loi: 'Tài khoản này đang bị khoá.' };

  await donPhienCu();
  await moPhien(nguoi.id);
  redirect('/');
}

export async function dangKy(_truoc: KetQuaXacThuc, form: FormData): Promise<KetQuaXacThuc> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const tenHienThi = String(form.get('tenHienThi') ?? '').trim();
  const matKhau = String(form.get('matKhau') ?? '');

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { loi: 'Địa chỉ email trông không hợp lệ.' };
  if (tenHienThi.length < 2) return { loi: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (matKhau.length < 8) return { loi: 'Mật khẩu cần ít nhất 8 ký tự.' };

  if (await db.nguoiDung.findUnique({ where: { email }, select: { id: true } })) {
    return { loi: 'Email này đã có tài khoản. Bạn muốn đăng nhập chứ?' };
  }

  // Tên đăng nhập suy ra từ tên hiển thị; trùng thì nối thêm số cho tới khi rỗi.
  const goc = thanhDuongDan(tenHienThi) || 'thanhvien';
  let tenDangNhap = goc;
  for (let i = 2; await db.nguoiDung.findUnique({ where: { tenDangNhap }, select: { id: true } }); i++) {
    tenDangNhap = `${goc}${i}`;
  }

  const nguoi = await db.nguoiDung.create({
    data: { email, tenDangNhap, tenHienThi, matKhauBam: await bamMatKhau(matKhau) },
    select: { id: true },
  });

  await moPhien(nguoi.id);
  redirect('/');
}

export async function dangXuat(): Promise<void> {
  await dongPhien();
  redirect('/');
}
