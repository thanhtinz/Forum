import { createHash, randomInt } from 'node:crypto';
import { db } from '@/lib/db';
import { HAN_MA_PHUT, SO_CHU_SO, TOI_DA_SAI, donMa, laMaHopLe } from '@/lib/ma-xac-minh-const';

export type ViecMa = 'DANG_KY' | 'DAT_LAI';

/**
 * Băm mã, có gắn email vào trước.
 *
 * Gắn email để một bảng tra dựng sẵn (một triệu dòng, dựng trong vài giây)
 * không dùng lại được cho người khác — muốn dò thì phải dựng riêng một bảng
 * cho từng địa chỉ.
 *
 * Phải nói thật: băm ở đây YẾU hơn hẳn chỗ mật khẩu. Sáu số chỉ có một triệu
 * khả năng, nên ai cầm được bảng này vẫn dò ngược ra mã trong tích tắc. Thứ
 * thật sự giữ an toàn là hạn ngắn, trần số lần gõ sai, và cửa chặn ở chỗ xin
 * mã — chứ không phải phép băm này. Vẫn băm vì nó chặn lối đọc lướt: mã không
 * nằm trần trong bản sao lưu hay trong một dòng nhật ký lỡ in cả hàng ra.
 */
function bam(email: string, ma: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}:${ma}`).digest('hex');
}

/**
 * Bốc một mã sáu số THẬT SỰ NGẪU NHIÊN.
 *
 * `randomInt` của `node:crypto` chứ không `Math.random()`: hàm kia đoán trước
 * được nếu biết đủ số nó đã trả về, mà ở đây mỗi mã là một cái chìa mở tài
 * khoản người khác.
 */
function bocMa(): string {
  return String(randomInt(0, 10 ** SO_CHU_SO)).padStart(SO_CHU_SO, '0');
}

export interface HoSoChoXacMinh {
  tenHienThi: string;
  matKhauBam: string;
}

/**
 * Phát một mã mới, trả về MÃ THẬT đúng một lần.
 *
 * Xoá sạch mã cũ chưa dùng của cùng email + cùng việc: phát cái thứ hai mà cái
 * thứ nhất còn sống thì có hai chìa cùng mở một cửa, mà người phát lại tưởng
 * cái cũ đã hỏng. Xin lại mã là huỷ mã trước — đó cũng là lối chữa khi lỡ gửi
 * mã nhầm chỗ.
 */
export async function phatMa(viec: ViecMa, email: string, kem?: {
  nguoiId?: string;
  hoSo?: HoSoChoXacMinh;
}): Promise<string> {
  const dc = email.toLowerCase();
  const ma = bocMa();
  const hetHan = new Date(Date.now() + HAN_MA_PHUT * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.maXacMinh.deleteMany({ where: { email: dc, viec, dungLuc: null } });
    await tx.maXacMinh.create({
      data: {
        viec, email: dc, ma: bam(dc, ma), hetHan,
        nguoiId: kem?.nguoiId ?? null,
        tenHienThi: kem?.hoSo?.tenHienThi ?? null,
        matKhauBam: kem?.hoSo?.matKhauBam ?? null,
      },
      select: { id: true },
    });
  });

  return ma;
}

export interface HangMa {
  id: string;
  nguoiId: string | null;
  tenHienThi: string | null;
  matKhauBam: string | null;
}

export type KetQuaTra =
  | { ok: true; hang: HangMa }
  | { ok: false; hetSuc: boolean };

/**
 * Tra một mã người ta gõ vào, và ĐẾM LƯỢT GÕ SAI.
 *
 * Đây là chỗ khác hẳn bản mã dài trước đây: mã ngắn thì phép tra không được
 * phép im lặng trả về "không thấy" rồi thôi — nó phải trừ dần số lần còn được
 * thử, không thì một triệu khả năng dò xong trong vài phút.
 *
 * Trừ theo HÀNG MÃ ĐANG SỐNG của email ấy, không theo mã người ta gõ: gõ sai
 * thì đâu biết họ định gõ mã nào. Hết trần là mã chết ngay, khỏi đợi hết hạn.
 *
 * `hetSuc` để nơi gọi nói cho người dùng biết phải xin mã mới — im lặng thì họ
 * ngồi gõ lại mãi một mã đã chết.
 */
export async function traMa(viec: ViecMa, email: string, maNguoi: string): Promise<KetQuaTra> {
  const dc = email.toLowerCase();
  const ma = donMa(maNguoi);

  const hang = await db.maXacMinh.findFirst({
    where: { email: dc, viec, dungLuc: null, hetHan: { gt: new Date() } },
    orderBy: { taoLuc: 'desc' },
    select: {
      id: true, ma: true, soLanSai: true,
      nguoiId: true, tenHienThi: true, matKhauBam: true,
    },
  });
  if (!hang) return { ok: false, hetSuc: false };

  if (laMaHopLe(ma) && hang.ma === bam(dc, ma)) {
    return { ok: true, hang };
  }

  /*
   * Ghi lượt sai bằng GHI CÓ ĐIỀU KIỆN, mang số cũ trong `where`.
   *
   * Không có điều kiện ấy thì mười lượt gõ sai bắn song song đều đọc ra cùng
   * một con số rồi cùng ghi lên "số cũ + 1" — đếm mãi vẫn là một, mà đó đúng
   * là lối một kịch bản dò mã sẽ đi.
   */
  const sauKhiSai = hang.soLanSai + 1;
  await db.maXacMinh.updateMany({
    where: { id: hang.id, soLanSai: hang.soLanSai },
    data: {
      soLanSai: sauKhiSai,
      // Hết trần thì đánh dấu đã dùng luôn — mã chết, không đợi hết hạn.
      dungLuc: sauKhiSai >= TOI_DA_SAI ? new Date() : null,
    },
  });

  return { ok: false, hetSuc: sauKhiSai >= TOI_DA_SAI };
}

/**
 * Đánh dấu đã dùng, theo lối GHI CÓ ĐIỀU KIỆN.
 *
 * Trả về `false` khi không còn hàng nào khớp — nghĩa là có lượt khác vừa dùng
 * xong mã này trong tích tắc giữa lúc tra và lúc ghi.
 */
export async function danhDauDaDung(id: string): Promise<boolean> {
  const { count } = await db.maXacMinh.updateMany({
    where: { id, dungLuc: null },
    data: { dungLuc: new Date() },
  });
  return count > 0;
}
