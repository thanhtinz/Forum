import 'server-only';
import { db } from './db';
import { auth } from './auth';
import { YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS, boThu } from './pokemon-const';

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
