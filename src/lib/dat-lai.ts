import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { HAN_MA_GIO, SO_BYTE_MA, donMa } from '@/lib/dat-lai-const';

/**
 * Băm mã đặt lại. SHA-256 chứ không bcrypt — xem chú thích ở `MaDatLai`.
 *
 * Nói gọn: ở đây phải TRA theo mã, mà bcrypt thì mỗi lần tra là quét cả bảng
 * thử từng hàng. Băm nhanh vẫn an toàn vì mã là 32 byte ngẫu nhiên, không có
 * gì để đoán mò — khác hẳn mật khẩu do người nghĩ ra.
 */
function bamMa(ma: string): string {
  return createHash('sha256').update(ma).digest('hex');
}

/**
 * Phát một mã mới cho một người, trả về MÃ THẬT đúng một lần.
 *
 * Xoá sạch mã cũ chưa dùng của người ấy trước khi phát: phát cái thứ hai mà
 * cái thứ nhất còn sống thì có hai chìa cùng mở được một cửa, mà người phát
 * lại tưởng cái cũ đã hỏng. Xin lại mã là huỷ mã trước — đó cũng chính là lối
 * để chữa khi lỡ đưa mã nhầm người.
 */
export async function phatMa(nguoiId: string): Promise<string> {
  const ma = randomBytes(SO_BYTE_MA).toString('base64url');
  const hetHan = new Date(Date.now() + HAN_MA_GIO * 3600 * 1000);

  await db.$transaction(async (tx) => {
    await tx.maDatLai.deleteMany({ where: { nguoiId, dungLuc: null } });
    await tx.maDatLai.create({
      data: { nguoiId, ma: bamMa(ma), hetHan }, select: { id: true },
    });
  });

  return ma;
}

/**
 * Tra một mã người ta gõ vào. `null` là không dùng được, không nói rõ vì sao.
 *
 * Ba điều kiện — đúng mã, chưa dùng, chưa hết hạn — đều nằm TRONG câu truy
 * vấn. Lấy về rồi mới xét thì có một khoảnh khắc mã đang cầm bản ghi của một
 * mã đã chết, và chỉ cần quên một câu `if` là nó đi tiếp.
 */
export async function traMa(maNguoi: string): Promise<{ id: string; nguoiId: string } | null> {
  const sach = donMa(maNguoi);
  // Dài quá thì thôi khỏi băm: mã thật luôn đúng một độ dài, còn chuỗi vài
  // nghìn ký tự chỉ có thể là ai đó đang thử phá.
  if (!sach || sach.length > 200) return null;

  return db.maDatLai.findFirst({
    where: { ma: bamMa(sach), dungLuc: null, hetHan: { gt: new Date() } },
    select: { id: true, nguoiId: true },
  });
}

/**
 * Đánh dấu đã dùng, theo lối GHI CÓ ĐIỀU KIỆN.
 *
 * Trả về `false` khi không còn hàng nào khớp — nghĩa là có lượt khác vừa dùng
 * xong mã này trong tích tắc giữa lúc tra và lúc ghi. Xét `count` thay vì tin
 * vào kết quả tra ở trên là chỗ chặn hai người cùng đổi một mật khẩu bằng
 * cùng một mã.
 */
export async function danhDauDaDung(id: string): Promise<boolean> {
  const { count } = await db.maDatLai.updateMany({
    where: { id, dungLuc: null },
    data: { dungLuc: new Date() },
  });
  return count > 0;
}
