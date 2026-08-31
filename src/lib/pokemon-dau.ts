import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import { db } from './db';
import {
  DAU_MAU_THUA, DAU_VANG, DIEM_DAU_DAU, HANG_MUA, diemSauTran, hangTheoDiem, muaCua,
} from './pokemon-const';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Chốt những kèo đã quá hạn — chốt LƯỜI, gọi trước mỗi lần đọc đấu trường.
 *
 * Không có tiến trình nền nào cả: hạn giờ chỉ là một cột thời gian, ai đọc tới
 * thì dọn hộ. Cách này đã dùng cho phiên bầu cua và cho bảng đơn hàng nông
 * trại, nên không phải mẫu mới.
 *
 *  • Kèo chưa ai vào mà quá hạn → huỷ, không phạt ai.
 *  • Kèo đang đánh mà quá hạn → bên ĐẾN LƯỢT xử thua, đúng như bản gốc.
 */
export async function chotDauQuaHan(now = new Date()): Promise<void> {
  const quaHan = await db.pokeDau.findMany({
    where: { ketThuc: null, hanLuc: { lt: now } },
    take: 50,
    orderBy: { hanLuc: 'asc' },
  });
  for (const d of quaHan) {
    try {
      await db.$transaction(async (tx) => {
        // Điều kiện nằm trong `where`: kèo phải vẫn chưa kết thúc và vẫn quá
        // hạn, nên hai người cùng mở trang không chốt hai lần.
        const chot = await tx.pokeDau.updateMany({
          where: { id: d.id, ketThuc: null, hanLuc: { lt: now } },
          data: {
            ketThuc: now,
            thangId: d.doiId ? (d.luotCua === 'chu' ? d.doiId : d.chuId) : null,
            ke: d.doiId ? 'Hết giờ, bên đến lượt xử thua.' : 'Kèo hết hạn, không ai nhận.',
          },
        });
        if (chot.count === 0) return;
        if (!d.doiId) return;

        const thangId = d.luotCua === 'chu' ? d.doiId : d.chuId;
        const thuaId = d.luotCua === 'chu' ? d.chuId : d.doiId;
        const thuaThuId = d.luotCua === 'chu' ? d.chuThuId : d.doiThuId;
        await traThuong(tx, thangId, thuaId, thuaThuId);
      });
    } catch {
      // Một kèo hỏng không được kéo theo cả trang; lượt đọc sau dọn tiếp.
    }
  }
}

/** Cộng thưởng cho bên thắng, phạt bên thua. Dùng chung cho cả hết giờ lẫn hạ gục. */
export async function traThuong(
  tx: Tx, thangId: string, thuaId: string, thuaThuId: string | null,
  gapDoi = false,
): Promise<void> {
  const vang = DAU_VANG * (gapDoi ? 2 : 1);

  // Điểm xếp hạng: đọc cả hai hàng rồi ghi một lần cho mỗi bên, trong cùng
  // giao dịch với phần thưởng — không có đường nào để một bên lên điểm mà bên
  // kia không xuống.
  const [ben1, ben2] = await Promise.all([
    tx.pokeNhanVat.findUnique({ where: { id: thangId }, select: { diemDau: true } }),
    tx.pokeNhanVat.findUnique({ where: { id: thuaId }, select: { diemDau: true } }),
  ]);
  const diem = diemSauTran(
    ben1?.diemDau ?? DIEM_DAU_DAU, ben2?.diemDau ?? DIEM_DAU_DAU, true,
  );

  await tx.pokeNhanVat.update({
    where: { id: thangId },
    data: { vang: { increment: vang }, thangDau: { increment: 1 }, diemDau: diem.toi },
  });
  await tx.pokeNhanVat.update({ where: { id: thuaId }, data: { diemDau: diem.dich } });
  // Vàng không được âm: trừ có điều kiện, thiếu thì lấy nốt phần còn lại.
  const tru = await tx.pokeNhanVat.updateMany({
    where: { id: thuaId, vang: { gte: vang } },
    data: { vang: { decrement: vang } },
  });
  if (tru.count === 0) {
    await tx.pokeNhanVat.updateMany({ where: { id: thuaId }, data: { vang: 0 } });
  }
  if (thuaThuId) {
    await tx.pokeThu.updateMany({
      where: { id: thuaThuId }, data: { mau: DAU_MAU_THUA },
    });
  }
}

/**
 * Chốt mùa cũ cho MỘT người, chốt lười lúc họ mở trang đấu trường.
 *
 * Không chụp lại bảng xếp hạng: mỗi người chốt vào một lúc khác nhau nên bảng
 * ấy không có thời điểm nào là đúng. Thưởng xét theo ĐIỂM của chính họ — xem
 * `HANG_MUA` trong `pokemon-const.ts`.
 *
 * Trả về phần thưởng vừa phát, hoặc rỗng nếu chưa tới mùa mới.
 */
export async function chotMuaDau(nhanVatId: string, now = new Date()) {
  const mua = muaCua(now);
  const nv = await db.pokeNhanVat.findUnique({
    where: { id: nhanVatId }, select: { id: true, muaDau: true, diemDau: true },
  });
  if (!nv) return null;

  // Lần đầu tiên: chỉ ghi mùa hiện tại, không phát thưởng cho một mùa chưa đánh.
  if (nv.muaDau === 0) {
    await db.pokeNhanVat.updateMany({
      where: { id: nhanVatId, muaDau: 0 }, data: { muaDau: mua },
    });
    return null;
  }
  if (nv.muaDau >= mua) return null;

  const hang = hangTheoDiem(nv.diemDau);
  // Mùa cũ nằm trong `where`: hai tab cùng mở trang thì tab sau đếm được 0
  // dòng và không phát thưởng lần thứ hai.
  const ghi = await db.pokeNhanVat.updateMany({
    where: { id: nhanVatId, muaDau: nv.muaDau },
    data: {
      muaDau: mua, diemDau: DIEM_DAU_DAU,
      ...(hang
        ? {
          vang: { increment: hang.vang },
          ngoc: { increment: hang.ngoc },
          da: { increment: hang.da },
        }
        : {}),
    },
  });
  if (ghi.count === 0) return null;
  return { hang, diemCu: nv.diemDau, muaCu: nv.muaDau };
}

export { HANG_MUA };
