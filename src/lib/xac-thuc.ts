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

/**
 * Đóng MỌI phiên của một người, TRỪ phiên đang dùng.
 *
 * Gọi sau khi đổi mật khẩu. Đổi mật khẩu mà mấy phiên cũ vẫn sống thì việc ấy
 * gần như vô nghĩa: người ta đổi mật khẩu chính vì nghi có kẻ khác đang đăng
 * nhập, mà kẻ ấy giữ cookie chứ có cần biết mật khẩu đâu.
 *
 * Chừa lại phiên hiện tại để chính người vừa đổi không bị đá ra — đá ra ngay
 * sau khi đổi thì ai cũng tưởng mình vừa làm hỏng cái gì.
 */
export async function dongPhienKhac(nguoiId: string): Promise<number> {
  const ma = (await cookies()).get(TEN_COOKIE)?.value;
  const { count } = await db.phien.deleteMany({
    where: { nguoiId, ...(ma ? { NOT: { ma: bamMa(ma) } } : {}) },
  });
  return count;
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
  if (!phien) return null;

  void danhDauCoMat(phien.nguoi.id);
  return phien.nguoi;
}

/** Không ghi lại dấu có mặt quá dày hơn khoảng này. */
const NHIP_GHE_MS = 15 * 60 * 1000;

/**
 * Đánh dấu "người này vừa ghé".
 *
 * VÌ SAO CẦN: người bán hàng đang phải quyết định có khoá một tài khoản hay
 * không mà chỉ nhìn thấy ngày họ đăng ký. Một tài khoản mở ba năm trước và một
 * tài khoản đang rải bài lúc này trông y hệt nhau trên bảng thành viên.
 *
 * GHI THƯA, và ghi bằng ĐÚNG MỘT câu lệnh có điều kiện. Hàm này chạy gần như
 * mỗi lần vẽ một trang, nên ghi mỗi lượt là mỗi lượt xem trang đẻ thêm một
 * lượt ghi vào cùng một hàng — chính là kiểu tranh chấp làm nghẽn cả bảng
 * người dùng. Điều kiện "cũ hơn 15 phút" nằm trong `where`, nên không cần đọc
 * lên xem rồi mới quyết: CSDL tự bỏ qua những lượt không cần ghi.
 *
 * KHÔNG `await`, và nuốt lỗi: đây là ghi chú bên lề, nó không được quyền làm
 * chậm hay làm hỏng trang mà nó đang ghi chú.
 */
function danhDauCoMat(nguoiId: string): void {
  const nguong = new Date(Date.now() - NHIP_GHE_MS);
  void db.nguoiDung.updateMany({
    where: { id: nguoiId, OR: [{ ghePhutCuoi: null }, { ghePhutCuoi: { lt: nguong } }] },
    data: { ghePhutCuoi: new Date() },
  }).catch(() => {});
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
