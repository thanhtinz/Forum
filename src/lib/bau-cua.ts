import { db } from './db';
import { grantPoints } from './points';
import {
  BAUCUA_BET_MS, BAUCUA_CONS, BAUCUA_CUA_MOI_PHIEN, BAUCUA_PHIEN_MOI_NGAY, BAUCUA_ROUND_MS,
} from './mini-game-const';
import { dauNgayVN } from './mini-game';

/**
 * Bàn bầu cua chung — mọi thứ về phiên.
 *
 * Không có tiến trình chạy nền nào cả: phiên TÍNH THEO ĐỒNG HỒ. Mã phiên là mốc
 * giây bắt đầu, nên ai hỏi lúc nào cũng ra cùng một phiên. Việc "xóc" xảy ra
 * lười biếng — người đầu tiên ghé vào sau giờ xóc sẽ chốt sổ phiên trước đó.
 */

export interface CuaDat {
  con: number;
  tong: number;
  /** Số người đang đặt cửa này. */
  nguoi: number;
  /** Phần của chính người đang xem. */
  cuaToi: number;
}

export interface BanBauCua {
  roundId: string;
  startAt: Date;
  closeAt: Date;
  /** Còn bao nhiêu mili giây nữa hết giờ đặt (âm là đã đóng cửa). */
  conMs: number;
  dangDat: boolean;
  cua: CuaDat[];
  /** Kết quả phiên VỪA XONG, để người đang xem thấy bát vừa mở. */
  truoc: { roundId: string; dice: number[]; anMs: number } | null;
  /** Điểm ăn/thua của chính người xem ở phiên vừa xong. */
  toiDuoc: number | null;
}

/** Mốc bắt đầu của phiên chứa thời điểm `t`. */
function mocPhien(t = Date.now()): number {
  return Math.floor(t / BAUCUA_ROUND_MS) * BAUCUA_ROUND_MS;
}

/**
 * Lấy (tạo nếu chưa có) hàng phiên ứng với một mốc, trả về CẢ hàng.
 *
 * Trả cả hàng chứ không chỉ mã, vì giờ đóng cửa phải đọc từ hàng ấy. Tính lại
 * từ đồng hồ thì có hai nguồn sự thật: chỗ chốt sổ đọc `closeAt` đã lưu, chỗ
 * hiển thị lại tự tính — lệch nhau một giây là có kẽ đặt cửa vào phiên vừa xóc
 * xong, mà cửa ấy thì không bao giờ được trả.
 */
async function layPhien(moc: number) {
  const id = String(moc);
  const chon = { id: true, startAt: true, closeAt: true, rolledAt: true } as const;
  const co = await db.bauCuaRound.findUnique({ where: { id }, select: chon });
  if (co) return co;
  // Hai người cùng ghé đúng lúc phiên mới mở thì cả hai cùng tạo — hàng thứ
  // hai đụng khoá chính, đọc lại là ra hàng của người kia.
  return (
    await db.bauCuaRound
      .create({
        data: { id, startAt: new Date(moc), closeAt: new Date(moc + BAUCUA_BET_MS) },
        select: chon,
      })
      .catch(() => db.bauCuaRound.findUniqueOrThrow({ where: { id }, select: chon }))
  );
}

/**
 * Chốt sổ mọi phiên đã qua giờ xóc mà chưa xóc.
 *
 * Ghi có điều kiện (`updateMany ... where rolledAt: null`): mười người cùng ghé
 * thì chỉ một người thật sự xóc, chín người kia thấy `count === 0` và đi tiếp.
 * Trả điểm nằm trong cùng transaction với việc ghi `payout`, nên không có cách
 * nào trả hai lần.
 */
export async function chotSoPhienCu(): Promise<void> {
  const chuaXong = await db.bauCuaRound.findMany({
    where: { rolledAt: null, closeAt: { lte: new Date() } },
    orderBy: { startAt: 'asc' },
    take: 20,
    select: { id: true },
  });

  for (const r of chuaXong) {
    const dice = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
    await db.$transaction(async (tx) => {
      const chot = await tx.bauCuaRound.updateMany({
        where: { id: r.id, rolledAt: null },
        data: { rolledAt: new Date(), dice: dice.join(',') },
      });
      if (chot.count === 0) return; // người khác vừa xóc rồi

      // Lấy theo lô có con trỏ: một phiên đông người có thể mang hàng nghìn
      // cửa, kéo hết về một lượt là tự dựng một quả bom trong transaction.
      let moc: string | undefined;
      for (;;) {
        const bets = await tx.bauCuaBet.findMany({
          where: { roundId: r.id },
          orderBy: { id: 'asc' },
          take: 200,
          ...(moc ? { skip: 1, cursor: { id: moc } } : {}),
          select: { id: true, userId: true, con: true, amount: true },
        });
        if (bets.length === 0) break;
        moc = bets[bets.length - 1]!.id;

        for (const b of bets) {
          const trung = dice.filter((d) => d === b.con).length;
          // Trúng mấy viên ăn bấy nhiêu lần cược, cộng cả tiền cược trả lại.
          const tra = trung === 0 ? 0 : b.amount * (trung + 1);
          await tx.bauCuaBet.update({ where: { id: b.id }, data: { payout: tra }, select: { id: true } });
          if (tra > 0) {
            await grantPoints({
              userId: b.userId, amount: tra, reason: 'GAME_WIN',
              refId: r.id, note: `Bầu cua phiên ${r.id}: trúng ${trung} con`,
            }, tx);
          }
        }
      }
    }).catch(() => {});
  }
}

/** Tình hình bàn lúc này, nhìn từ phía `userId`. */
export async function xemBan(userId: string | null): Promise<BanBauCua> {
  await chotSoPhienCu();

  const now = Date.now();
  const phien = await layPhien(mocPhien(now));
  const roundId = phien.id;
  const closeAt = phien.closeAt;

  const [nhom, cuaToi, phienTruoc] = await Promise.all([
    db.bauCuaBet.groupBy({
      by: ['con'], where: { roundId }, _sum: { amount: true }, _count: { _all: true },
    }),
    userId
      // Mỗi người tối đa sáu cửa một phiên (ràng buộc `@@unique` lo phần ấy).
      ? db.bauCuaBet.findMany({
          where: { roundId, userId }, take: BAUCUA_CUA_MOI_PHIEN,
          select: { con: true, amount: true },
        })
      : Promise.resolve([]),
    db.bauCuaRound.findFirst({
      where: { rolledAt: { not: null }, dice: { not: null } },
      orderBy: { startAt: 'desc' },
      select: { id: true, dice: true, startAt: true },
    }),
  ]);

  const cua = BAUCUA_CONS.map((c) => ({
    con: c.id,
    tong: nhom.find((n) => n.con === c.id)?._sum.amount ?? 0,
    nguoi: nhom.find((n) => n.con === c.id)?._count._all ?? 0,
    cuaToi: cuaToi.find((b) => b.con === c.id)?.amount ?? 0,
  }));

  let toiDuoc: number | null = null;
  if (userId && phienTruoc) {
    const cua0 = await db.bauCuaBet.findMany({
      where: { roundId: phienTruoc.id, userId }, take: BAUCUA_CUA_MOI_PHIEN,
      select: { amount: true, payout: true },
    });
    if (cua0.length > 0) {
      toiDuoc = cua0.reduce((s, b) => s + ((b.payout ?? 0) - b.amount), 0);
    }
  }

  return {
    roundId,
    startAt: phien.startAt,
    closeAt,
    conMs: closeAt.getTime() - now,
    dangDat: !phien.rolledAt && now < closeAt.getTime(),
    cua,
    truoc: phienTruoc?.dice
      ? {
          roundId: phienTruoc.id,
          dice: phienTruoc.dice.split(',').map(Number),
          anMs: now - phienTruoc.startAt.getTime(),
        }
      : null,
    toiDuoc,
  };
}

/** Số phiên người này đã đặt cửa hôm nay. */
export async function phienHomNay(userId: string): Promise<number> {
  const r = await db.bauCuaBet.groupBy({
    by: ['roundId'], where: { userId, createdAt: { gte: dauNgayVN() } },
  });
  return r.length;
}

export async function phienConLai(userId: string): Promise<number> {
  return Math.max(0, BAUCUA_PHIEN_MOI_NGAY - (await phienHomNay(userId)));
}
