import { db } from './db';
import type { Prisma } from '@prisma/client';
import { grantPoints } from './points';
import {
  BAUCUA_BET_MS, BAUCUA_CONS, BAUCUA_CUA_MOI_PHIEN, BAUCUA_PHIEN_MOI_NGAY,
  BAUCUA_REVEAL_MS, BAUCUA_ROUND_MS,
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

/** Pha của phiên: đang đặt cửa, đang xóc, hay đang mở bát. */
export type PhaBan = 'dat' | 'xoc' | 'kq';

export interface BanBauCua {
  roundId: string;
  pha: PhaBan;
  /** Còn bao nhiêu mili giây nữa hết pha hiện tại. */
  conMs: number;
  dangDat: boolean;
  cua: CuaDat[];
  /**
   * Ba mặt của CHÍNH phiên này — chỉ trả về khi đã tới giờ mở bát.
   *
   * Giấu ở máy chủ chứ không giấu ở giao diện: bát đã xóc xong từ giây 45, nếu
   * cứ gửi kèm rồi nhờ trang đừng vẽ ra thì ai mở công cụ nhà phát triển cũng
   * biết trước kết quả trong lúc người khác còn đang hồi hộp.
   */
  dice: number[] | null;
  /** Điểm ăn/thua của chính người xem ở phiên này (khi đã mở bát). */
  toiDuoc: number | null;
  /** Mấy phiên gần nhất, mới trước. */
  lichSu: { roundId: string; dice: number[] }[];
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

  const tuDau = now - phien.startAt.getTime();
  const pha: PhaBan = tuDau < BAUCUA_BET_MS ? 'dat' : tuDau < BAUCUA_REVEAL_MS ? 'xoc' : 'kq';
  const conMs = (pha === 'dat' ? BAUCUA_BET_MS : pha === 'xoc' ? BAUCUA_REVEAL_MS : BAUCUA_ROUND_MS) - tuDau;

  const [nhom, cuaToi, banThan, lichSu] = await Promise.all([
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
    db.bauCuaRound.findUnique({ where: { id: roundId }, select: { dice: true } }),
    db.bauCuaRound.findMany({
      where: { dice: { not: null }, id: { not: roundId } },
      orderBy: { startAt: 'desc' },
      take: 12,
      select: { id: true, dice: true },
    }),
  ]);

  const cua = BAUCUA_CONS.map((c) => ({
    con: c.id,
    tong: nhom.find((n) => n.con === c.id)?._sum.amount ?? 0,
    nguoi: nhom.find((n) => n.con === c.id)?._count._all ?? 0,
    cuaToi: cuaToi.find((b) => b.con === c.id)?.amount ?? 0,
  }));

  // Chỉ mở bát khi đã tới giờ mở.
  const dice = pha === 'kq' && banThan?.dice ? banThan.dice.split(',').map(Number) : null;

  let toiDuoc: number | null = null;
  if (userId && dice) {
    const cuaMinh = cuaToi.length > 0
      ? await db.bauCuaBet.findMany({
          where: { roundId, userId }, take: BAUCUA_CUA_MOI_PHIEN,
          select: { amount: true, payout: true },
        })
      : [];
    if (cuaMinh.length > 0) {
      toiDuoc = cuaMinh.reduce((s, b) => s + ((b.payout ?? 0) - b.amount), 0);
    }
  }

  return {
    roundId,
    pha,
    conMs,
    dangDat: pha === 'dat' && !phien.rolledAt && now < closeAt.getTime(),
    cua,
    dice,
    toiDuoc,
    lichSu: lichSu.map((r) => ({ roundId: r.id, dice: (r.dice ?? '').split(',').map(Number) })),
  };
}

/**
 * Số PHIÊN đã chơi hôm nay (không phải số cửa đã đặt).
 *
 * Nhận `tx` để gọi được từ trong transaction: trần ngày là một phép ĐẾM, mà
 * đếm ngoài khoá rồi ghi trong khoá thì hai tab bấm cùng lúc cùng thấy con số
 * cũ và cùng đi qua. Chỗ chặn thật phải đếm lại sau khi đã khoá.
 */
export async function phienHomNay(
  userId: string,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<number> {
  const r = await tx.bauCuaBet.groupBy({
    by: ['roundId'], where: { userId, createdAt: { gte: dauNgayVN() } },
  });
  return r.length;
}

export async function phienConLai(userId: string): Promise<number> {
  return Math.max(0, BAUCUA_PHIEN_MOI_NGAY - (await phienHomNay(userId)));
}
