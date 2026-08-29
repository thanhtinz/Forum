'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { getActiveBan, banMessage } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import {
  BAUCUA_CONS, BAUCUA_MAX, BAUCUA_MIN, GIFT_COOLDOWN_MS, GIFT_POINTS,
  OTT_MAX, OTT_MIN, OTT_TAY, VAN_MOI_NGAY, dauNgayVN, ottKetQua,
} from '@/lib/mini-game';

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

// ─────────────────────────── Hộp quà mỗi ngày ───────────────────────────

/**
 * Nhận quà. Bản gốc đếm đủ 24 giờ kể từ lần nhận trước chứ không reset lúc nửa
 * đêm — giữ nguyên nếp ấy.
 *
 * Ghi CÓ ĐIỀU KIỆN chứ không đọc-rồi-ghi: bấm hai lần cùng lúc thì cả hai cùng
 * đọc thấy "đã tới hạn" rồi cùng nhận.
 */
export async function nhanQua(): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const moc = new Date(Date.now() - GIFT_COOLDOWN_MS);
  const ghi = await db.user.updateMany({
    where: { id: me.userId, OR: [{ lastGiftAt: null }, { lastGiftAt: { lt: moc } }] },
    data: { lastGiftAt: new Date() },
  });
  if (ghi.count === 0) {
    const u = await db.user.findUnique({ where: { id: me.userId }, select: { lastGiftAt: true } });
    const con = Math.ceil(((u?.lastGiftAt?.getTime() ?? 0) + GIFT_COOLDOWN_MS - Date.now()) / 60000);
    return { error: `Chưa tới giờ. Còn ${con} phút nữa mới mở được hộp quà.` };
  }

  await grantPoints({
    userId: me.userId, amount: GIFT_POINTS, reason: 'GAME_GIFT', note: 'Hộp quà mỗi ngày',
  });
  await db.miniGamePlay.create({
    data: { userId: me.userId, game: 'GIFT', bet: 0, delta: GIFT_POINTS },
    select: { id: true },
  });

  revalidatePath('/giai-tri');
  return { ok: true, delta: GIFT_POINTS, ke: `Mở hộp quà được ${GIFT_POINTS} điểm.` };
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

export async function choiBauCua(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const con = Number(formData.get('con'));
  if (!BAUCUA_CONS.some((c) => c.id === con)) return { error: 'Chọn một con trên mâm đã nào.' };
  const cuoc = docCuoc(formData, BAUCUA_MIN, BAUCUA_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'BAUCUA', cuoc, () => {
    const mat = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
    const trung = mat.filter((m) => m === con).length;
    // Trúng mấy viên ăn bấy nhiêu lần cược; không viên nào thì mất cược.
    const delta = trung === 0 ? -cuoc : trung * cuoc;
    const tenCon = BAUCUA_CONS.find((c) => c.id === con)!.ten;
    const tenMat = mat.map((m) => BAUCUA_CONS.find((c) => c.id === m)!.ten).join(' · ');
    return {
      delta,
      detail: `${tenCon} | ${mat.join(',')}`,
      mat,
      ke: trung === 0
        ? `Mở bát: ${tenMat}. Không có con ${tenCon} nào, mất ${cuoc} điểm.`
        : `Mở bát: ${tenMat}. Trúng ${trung} con ${tenCon}, được ${delta} điểm!`,
    };
  });
  revalidatePath('/giai-tri/bau-cua');
  return r;
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
