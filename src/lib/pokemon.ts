import 'server-only';
import { db } from './db';
import { auth } from './auth';
import {
  NHIEM_VU_NGAY, YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS, boThu, dauNgayVN,
} from './pokemon-const';

export * from './pokemon-const';

/** Nhân vật của người đang đăng nhập, kèm con đang ra trận. */
export async function nhanVatCuaToi() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) return null;
  return db.pokeNhanVat.findUnique({
    where: { userId },
    include: { raTran: true },
  });
}

/** Con đang ra trận, hoặc con đầu tiên trong kho nếu chưa chọn. */
export async function conRaTran(nhanVatId: string, raTranId: string | null) {
  if (raTranId) {
    const c = await db.pokeThu.findFirst({ where: { id: raTranId, nhanVatId } });
    if (c) return c;
  }
  return db.pokeThu.findFirst({ where: { nhanVatId }, orderBy: { createdAt: 'asc' } });
}

/**
 * Còn bao lâu nữa mới được chữa tiếp.
 *
 * Bản gốc dùng CHUNG một mốc `bv` cho cả hồi máu lẫn hồi thể lực nhưng lại đặt
 * hai quãng chờ khác nhau (5 phút và 2 phút), nên chữa máu xong là khoá luôn
 * cả nút hồi thể lực. Giữ nguyên cách ấy: một mốc, hai quãng — vì đổi thành
 * hai mốc riêng là đổi hẳn nhịp chơi chứ không phải sửa lỗi.
 */
export function conChoYTe(chuaLuc: Date | null, choMs: number, now = Date.now()): number {
  if (!chuaLuc) return 0;
  return Math.max(0, chuaLuc.getTime() + choMs - now);
}

export const YTE = { YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS };
export { boThu };

/**
 * Tiến độ chuỗi nhiệm vụ, đọc thẳng từ dữ liệu thật.
 *
 * Không có cột riêng nào ghi "đã làm xong bước n" — mốc suy ra từ số thú
 * trong kho, số huy chương, cấp nhân vật và số trận thắng đấu trường. Nhờ vậy
 * không có đường nào để tiến độ lệch khỏi sự thật, mà cũng không cần rải mã
 * đánh dấu vào khắp các hàm chơi.
 */
export async function tienDoNhiemVu(nhanVatId: string): Promise<boolean[]> {
  const nv = await db.pokeNhanVat.findUnique({
    where: { id: nhanVatId },
    select: { huyChuong: true, cap: true, thangDau: true },
  });
  if (!nv) return [];
  const soThu = await db.pokeThu.count({ where: { nhanVatId } });
  return [soThu >= 2, nv.huyChuong >= 1, nv.cap >= 3, nv.thangDau >= 1];
}

/**
 * Ba việc hằng ngày của hôm nay, mở LƯỜI ngay lúc có người xem trang.
 *
 * Không có tiến trình nền nào cả — cùng lối `chotDauQuaHan` của đấu trường và
 * bảng đơn hàng nông trại. Dòng của hôm nay sinh ra kèm `mocDau` chép lại bộ
 * đếm tổng lúc ấy, nên tiến độ là hiệu số và không cần cột đếm riêng.
 *
 * Ràng buộc duy nhất `(nhanVatId, ngay, ma)` lo phần hai tab cùng mở trang:
 * dòng thứ hai bị chặn ở tầng cơ sở dữ liệu chứ không phải ở đây.
 */
export async function nhiemVuNgayHomNay(nhanVatId: string) {
  const nv = await db.pokeNhanVat.findUnique({
    where: { id: nhanVatId },
    select: { id: true, soHaGuc: true, soBat: true, thangDau: true },
  });
  if (!nv) return [];

  const ngay = dauNgayVN(new Date());
  for (const viec of NHIEM_VU_NGAY) {
    await db.pokeNhiemVuNgay.upsert({
      where: { nhanVatId_ngay_ma: { nhanVatId, ngay, ma: viec.ma } },
      update: {},
      create: { nhanVatId, ngay, ma: viec.ma, mocDau: nv[viec.mocTu] },
      select: { id: true },
    }).catch(() => null);
  }

  const dong = await db.pokeNhiemVuNgay.findMany({
    where: { nhanVatId, ngay },
    select: { ma: true, mocDau: true, daNhan: true },
    take: NHIEM_VU_NGAY.length,
  });
  const theoMa = new Map(dong.map((d) => [d.ma, d]));

  return NHIEM_VU_NGAY.map((viec) => {
    const d = theoMa.get(viec.ma);
    const lam = Math.max(0, Math.min(viec.can, (nv[viec.mocTu] ?? 0) - (d?.mocDau ?? 0)));
    return { ...viec, lam, xong: lam >= viec.can, daNhan: d?.daNhan ?? false };
  });
}

/** Số loài đã gặp và đã bắt trong sổ Đồ Giám. */
export async function tienDoDoGiam(nhanVatId: string) {
  const [daGap, daBat] = await Promise.all([
    db.pokeDoGiam.count({ where: { nhanVatId } }),
    db.pokeDoGiam.count({ where: { nhanVatId, daBat: true } }),
  ]);
  return { daGap, daBat };
}
