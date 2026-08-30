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
