import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';

/*
 * PHIÊN ĐĂNG NHẬP TỰ VIẾT.
 *
 * Chỉ cần đúng một kiểu đăng nhập (tên/email + mật khẩu), nên cả một thư viện
 * xác thực với hàng chục nhà cung cấp là thừa. Ở đây làm đúng phần cần:
 *
 *   • Cookie chỉ mang MỘT mã ngẫu nhiên, không mang thông tin gì về người dùng
 *     — kể cả sửa được cookie cũng không tự phong mình làm quản trị được.
 *   • Bảng `Phien` mới là nơi giữ sự thật, nên KHOÁ một tài khoản là đá được
 *     người ấy ra ngay lập tức; cookie tự ký thì phải đợi tới lúc hết hạn.
 *   • Trong CSDL lưu BẢN BĂM của mã phiên, không lưu mã gốc: ai đọc trộm được
 *     bảng cũng không mạo danh được ai.
 */

const TEN_COOKIE = 'sunny_phien';
const HAN_NGAY = 30;

function bamMa(ma: string): string {
  return createHash('sha256').update(ma).digest('hex');
}

export async function bamMatKhau(matKhau: string): Promise<string> {
  return bcrypt.hash(matKhau, 10);
}

export async function khopMatKhau(matKhau: string, bam: string): Promise<boolean> {
  return bcrypt.compare(matKhau, bam);
}

/** Mở một phiên mới và đặt cookie. Gọi sau khi đã kiểm mật khẩu xong. */
export async function moPhien(nguoiId: string): Promise<void> {
  const ma = randomBytes(32).toString('base64url');
  const hetHan = new Date(Date.now() + HAN_NGAY * 24 * 3600 * 1000);

  await db.phien.create({ data: { ma: bamMa(ma), nguoiId, hetHan }, select: { id: true } });

  (await cookies()).set(TEN_COOKIE, ma, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: hetHan,
  });
}

export async function dongPhien(): Promise<void> {
  const kho = await cookies();
  const ma = kho.get(TEN_COOKIE)?.value;
  if (ma) await db.phien.deleteMany({ where: { ma: bamMa(ma) } });
  kho.delete(TEN_COOKIE);
}

export interface NguoiDangNhap {
  id: string;
  tenDangNhap: string;
  tenHienThi: string;
  anh: string | null;
  vaiTro: 'THANH_VIEN' | 'QUAN_TRI';
}

/**
 * Ai đang xem trang này — `null` nếu là khách.
 *
 * Hạn phiên nằm TRONG câu truy vấn chứ không kiểm sau khi lấy về: lọc sau thì
 * vẫn có một khoảnh khắc mã cầm trong tay bản ghi của một phiên đã hết hạn.
 * Tài khoản bị khoá cũng xét ngay ở đây, cùng lẽ ấy.
 */
export async function nguoiHienTai(): Promise<NguoiDangNhap | null> {
  const ma = (await cookies()).get(TEN_COOKIE)?.value;
  if (!ma) return null;

  const phien = await db.phien.findFirst({
    where: { ma: bamMa(ma), hetHan: { gt: new Date() }, nguoi: { khoa: false } },
    select: {
      nguoi: {
        select: { id: true, tenDangNhap: true, tenHienThi: true, anh: true, vaiTro: true },
      },
    },
  });
  return phien?.nguoi ?? null;
}

/** Như trên nhưng ném ra lỗi nếu là khách — dùng trong server action. */
export async function batBuocDangNhap(): Promise<NguoiDangNhap> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) throw new Error('Bạn cần đăng nhập.');
  return nguoi;
}

export async function batBuocQuanTri(): Promise<NguoiDangNhap> {
  const nguoi = await batBuocDangNhap();
  if (nguoi.vaiTro !== 'QUAN_TRI') throw new Error('Chỉ quản trị viên làm được việc này.');
  return nguoi;
}

/** Dọn phiên đã hết hạn. Gọi lười lúc có người đăng nhập, không có tác vụ nền. */
export async function donPhienCu(): Promise<void> {
  await db.phien.deleteMany({ where: { hetHan: { lt: new Date() } } });
}
