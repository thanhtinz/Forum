'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { getActiveBan, banMessage } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import {
  BAUCUA_CONS, BAUCUA_MAX, BAUCUA_MIN, BAUCUA_CUA_MOI_PHIEN, BAUCUA_PHIEN_MOI_NGAY,
  OTT_MAX, OTT_MIN, OTT_TAY, VAN_MOI_NGAY, dauNgayVN, ottKetQua,
} from '@/lib/mini-game';
import { phienHomNay, xemBan } from '@/lib/bau-cua';

export interface GameState {
  ok?: boolean;
  error?: string;
  /** Câu kể lại lượt vừa rồi, in ngay trên trang. */
  ke?: string;
  /** Ba mặt xúc xắc (bầu cua) hoặc tay của máy (oẳn tù tì), để giao diện vẽ lại. */
  mat?: number[];
  delta?: number;
}

/** Người chơi hợp lệ: đã đăng nhập và không bị cấm. */
async function nguoiChoi() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để chơi.' as const };
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chơi ở khu giải trí') };
  return { userId };
}

// ─────────────────────────── Nền chung cho trò cược ───────────────────────────

/** Đọc và kiểm số điểm cược. */
function docCuoc(formData: FormData, min: number, max: number): number | string {
  const raw = String(formData.get('cuoc') ?? '').trim();
  const n = Number(raw);
  if (!Number.isInteger(n)) return 'Số điểm cược phải là số nguyên.';
  if (n < min || n > max) return `Mỗi ván cược từ ${min} đến ${max} điểm.`;
  return n;
}

/**
 * Khoá người chơi, kiểm trần ván trong ngày, rồi chạy một lượt.
 *
 * Khoá vì `grantPoints` chỉ đảm bảo không âm điểm, còn "mỗi ngày N ván" là luật
 * đọc-rồi-ghi: bấm hai tab cùng lúc là vượt trần.
 */
async function choiMotVan(
  userId: string,
  game: 'BAUCUA' | 'OANTUTI',
  cuoc: number,
  chay: () => { delta: number; detail: string; ke: string; mat: number[] },
): Promise<GameState> {
  try {
    return await db.$transaction(async (tx) => {
      await lockUsers(tx, userId);

      const daChoi = await tx.miniGamePlay.count({
        where: { userId, game, createdAt: { gte: dauNgayVN() } },
      });
      if (daChoi >= VAN_MOI_NGAY) {
        return { error: `Hôm nay bạn chơi đủ ${VAN_MOI_NGAY} ván rồi, để mai chơi tiếp nhé.` };
      }

      const kq = chay();

      // Trừ trước, cộng sau — trừ trước thì thiếu điểm là dừng ngay tại đây,
      // không có đường nào cộng thưởng cho một ván chưa trả tiền.
      await grantPoints({ userId, amount: -cuoc, reason: 'GAME_BET', note: `Cược: ${kq.detail}` }, tx);
      const thuong = kq.delta + cuoc;
      if (thuong > 0) {
        await grantPoints({ userId, amount: thuong, reason: 'GAME_WIN', note: `Thắng: ${kq.detail}` }, tx);
      }
      await tx.miniGamePlay.create({
        data: { userId, game, bet: cuoc, delta: kq.delta, detail: kq.detail },
        select: { id: true },
      });

      return { ok: true, ke: kq.ke, mat: kq.mat, delta: kq.delta };
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: 'Bạn không đủ điểm để cược ván này.' };
    return { error: 'Không chơi được lúc này, thử lại nhé.' };
  }
}

// ─────────────────────────── Bầu cua tôm cá ───────────────────────────

/**
 * Đặt một cửa lên bàn chung.
 *
 * Trừ điểm NGAY lúc đặt: không ai được ngồi vào chiếu mà chưa trả tiền, và tới
 * lúc xóc thì việc trả thưởng chỉ còn là cộng vào, không phải đi đòi ai cả.
 * Trả thưởng nằm ở `chotSoPhienCu` trong `src/lib/bau-cua.ts`.
 */
export async function datCua(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const con = Number(formData.get('con'));
  if (!BAUCUA_CONS.some((c) => c.id === con)) return { error: 'Chọn một cửa trên bàn đã nào.' };
  const cuoc = docCuoc(formData, BAUCUA_MIN, BAUCUA_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const ban = await xemBan(me.userId);
  if (!ban.dangDat) return { error: 'Hết giờ đặt cửa rồi, chờ phiên sau nhé.' };

  const daDat = await phienHomNay(me.userId);
  const dangChoiPhienNay = ban.cua.some((c) => c.cuaToi > 0);
  if (!dangChoiPhienNay && daDat >= BAUCUA_PHIEN_MOI_NGAY) {
    return { error: `Hôm nay bạn chơi đủ ${BAUCUA_PHIEN_MOI_NGAY} phiên rồi, để mai chơi tiếp nhé.` };
  }

  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId);

      // Kiểm LẠI trong transaction: giữa lúc đọc bàn ở trên và lúc ghi ở đây,
      // phiên có thể đã hết giờ và bị người khác chốt sổ. Cửa đặt sau khi chốt
      // thì không bao giờ được trả — mất trắng mà chẳng ai biết vì sao.
      const conNhan = await tx.bauCuaRound.count({
        where: { id: ban.roundId, rolledAt: null, closeAt: { gt: new Date() } },
      });
      if (conNhan === 0) throw new Error('het-gio');

      // Đặt thêm vào cửa đã có thì cộng dồn; mỗi phiên tối đa sáu cửa là hết bàn.
      const cu = await tx.bauCuaBet.findUnique({
        where: { roundId_userId_con: { roundId: ban.roundId, userId: me.userId, con } },
        select: { id: true, amount: true },
      });
      if (!cu) {
        const soCua = await tx.bauCuaBet.count({ where: { roundId: ban.roundId, userId: me.userId } });
        if (soCua >= BAUCUA_CUA_MOI_PHIEN) throw new Error('het-cua');
      }
      if (cu && cu.amount + cuoc > BAUCUA_MAX) throw new Error('qua-tran');

      await grantPoints({
        userId: me.userId, amount: -cuoc, reason: 'GAME_BET',
        refId: ban.roundId, note: `Bầu cua: đặt ${BAUCUA_CONS.find((c) => c.id === con)!.ten}`,
      }, tx);

      if (cu) {
        await tx.bauCuaBet.update({
          where: { id: cu.id }, data: { amount: { increment: cuoc } }, select: { id: true },
        });
      } else {
        await tx.bauCuaBet.create({
          data: { roundId: ban.roundId, userId: me.userId, con, amount: cuoc },
          select: { id: true },
        });
      }
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: 'Bạn không đủ điểm để đặt cửa này.' };
    if (e instanceof Error && e.message === 'het-gio') {
      return { error: 'Hết giờ đặt cửa rồi, chờ phiên sau nhé.' };
    }
    if (e instanceof Error && e.message === 'het-cua') {
      return { error: `Mỗi phiên đặt tối đa ${BAUCUA_CUA_MOI_PHIEN} cửa.` };
    }
    if (e instanceof Error && e.message === 'qua-tran') {
      return { error: `Mỗi cửa tối đa ${BAUCUA_MAX} điểm trong một phiên.` };
    }
    return { error: 'Không đặt được lúc này, thử lại nhé.' };
  }

  revalidatePath('/giai-tri/bau-cua');
  return { ok: true, ke: `Đã đặt ${cuoc} điểm cửa ${BAUCUA_CONS.find((c) => c.id === con)!.ten}.` };
}

// ─────────────────────────── Oẳn tù tì ───────────────────────────

export async function choiOanTuTi(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const tay = Number(formData.get('tay'));
  if (!OTT_TAY.some((t) => t.id === tay)) return { error: 'Ra tay đi đã.' };
  const cuoc = docCuoc(formData, OTT_MIN, OTT_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'OANTUTI', cuoc, () => {
    const may = 1 + Math.floor(Math.random() * 3);
    const kq = ottKetQua(tay, may);
    const tenMay = OTT_TAY.find((t) => t.id === may)!.ten;
    const tenToi = OTT_TAY.find((t) => t.id === tay)!.ten;
    return {
      // Hoà thì trả lại đúng số đã cược, không mất gì.
      delta: kq * cuoc,
      detail: `${tenToi} vs ${tenMay}`,
      mat: [may],
      ke: kq === 0
        ? `Máy cũng ra ${tenMay}. Hoà, không mất điểm nào.`
        : kq > 0
          ? `Máy ra ${tenMay}. Bạn thắng, được ${cuoc} điểm!`
          : `Máy ra ${tenMay}. Bạn thua, mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/oan-tu-ti');
  return r;
}
