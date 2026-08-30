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
  PHITIEU_MAT, PHITIEU_MAX, PHITIEU_MIN,
  SOCDIA_MAX, SOCDIA_MIN,
  SUT_GOC, SUT_MAX, SUT_MIN, sutThuong,
  TRUNG_BOI, TRUNG_BOI_VANG, TRUNG_MAX, TRUNG_MIN, TRUNG_SO,
  XENG_BIEU_TUONG, XENG_MAX, XENG_MIN, xengDo,
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
  game: 'BAUCUA' | 'OANTUTI' | 'QUAYXENG' | 'PHITIEU' | 'SOCDIA' | 'DAPTRUNG' | 'SUTPHAT',
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

  // Kiểm sớm một lần cho người dùng biết ngay, KHÔNG dựa vào nó để chặn —
  // phép chặn thật nằm trong khoá bên dưới.
  const dangChoiPhienNay = ban.cua.some((c) => c.cuaToi > 0);
  if (!dangChoiPhienNay && (await phienHomNay(me.userId)) >= BAUCUA_PHIEN_MOI_NGAY) {
    return { error: `Hôm nay bạn chơi đủ ${BAUCUA_PHIEN_MOI_NGAY} phiên rồi, để mai chơi tiếp nhé.` };
  }

  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId);

      /*
       * Đếm LẠI trần ngày sau khi đã khoá.
       *
       * Trần ngày là một phép đếm trên nhiều hàng, thứ mà một câu `where` không
       * nói được — nên đọc ngoài khoá rồi ghi trong khoá là đúng cái mẫu
       * đọc-rồi-ghi mà dự án cấm: hai tab bấm cùng lúc cùng thấy con số cũ và
       * cùng đi qua. Hôm nay khó nổ vì hai phiên cách nhau 60 giây, nhưng rút
       * `BAUCUA_ROUND_MS` xuống là nổ ngay.
       */
      const daDatTrongKhoa = await phienHomNay(me.userId, tx);
      const dangChoiPhienNayThat = (await tx.bauCuaBet.count({
        where: { roundId: ban.roundId, userId: me.userId },
      })) > 0;
      if (!dangChoiPhienNayThat && daDatTrongKhoa >= BAUCUA_PHIEN_MOI_NGAY) {
        throw new Error('het-phien');
      }

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
    if (e instanceof Error && e.message === 'het-phien') {
      return { error: `Hôm nay bạn chơi đủ ${BAUCUA_PHIEN_MOI_NGAY} phiên rồi, để mai chơi tiếp nhé.` };
    }
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

// ─────────────────────────── Máy quay xèng ───────────────────────────

/** Một số nguyên 1..n. Gom lại một chỗ cho khỏi rải `Math.random` khắp tệp. */
function tung(n: number): number {
  return 1 + Math.floor(Math.random() * n);
}

export async function choiQuayXeng(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };
  const cuoc = docCuoc(formData, XENG_MIN, XENG_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'QUAYXENG', cuoc, () => {
    const o = Array.from({ length: 9 }, () => tung(XENG_BIEU_TUONG.length));
    const { duong, boi } = xengDo(o);
    // `boi` là bội số TRẢ VỀ tính cả tiền cược, nên lãi thật là (boi − 1) lần.
    // Không đường nào thì boi = 0, ra đúng −1 lần cược, khỏi phải rẽ nhánh.
    const delta = cuoc * boi - cuoc;
    return {
      delta,
      detail: o.join(''),
      // `mat` chở cả lưới rồi tới danh sách đường trúng, giao diện tự cắt.
      mat: [...o, -1, ...duong],
      ke: duong.length
        ? `Trúng ${duong.length} đường, trả ${boi}× cược: ${delta >= 0 ? '+' : ''}${delta} điểm!`
        : `Không đường nào trùng. Mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/quay-xeng');
  return r;
}

// ─────────────────────────── Phi tiêu ───────────────────────────

export async function choiPhiTieu(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };
  const cuoc = docCuoc(formData, PHITIEU_MIN, PHITIEU_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'PHITIEU', cuoc, () => {
    const toi = tung(PHITIEU_MAT);
    const may = tung(PHITIEU_MAT);
    const kq = toi === may ? 0 : toi > may ? 1 : -1;
    return {
      delta: kq * cuoc,
      detail: `${toi} vs ${may}`,
      mat: [toi, may],
      ke: kq === 0
        ? `Cả hai cùng ${toi} điểm. Hoà, không mất điểm nào.`
        : kq > 0
          ? `Bạn ${toi} — máy ${may}. Bạn thắng, được ${cuoc} điểm!`
          : `Bạn ${toi} — máy ${may}. Bạn thua, mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/phi-tieu');
  return r;
}

// ─────────────────────────── Sóc đĩa ───────────────────────────

export async function choiSocDia(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const cua = Number(formData.get('cua'));
  if (cua !== 1 && cua !== 2) return { error: 'Chọn chẵn hoặc lẻ đã nào.' };
  const cuoc = docCuoc(formData, SOCDIA_MIN, SOCDIA_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'SOCDIA', cuoc, () => {
    // Bốn đồng tiền như bát sóc đĩa thật: đếm mặt ngửa rồi xét chẵn/lẻ. Tung
    // thẳng một trong hai cửa cũng ra đúng 50/50, nhưng bày bốn đồng thì người
    // chơi nhìn thấy kết quả từ đâu ra chứ không phải tin suông.
    const dong = Array.from({ length: 4 }, () => tung(2) - 1);
    const ngua = dong.reduce((a, b) => a + b, 0);
    const ra = ngua % 2 === 0 ? 1 : 2;
    const thang = ra === cua;
    const tenRa = ra === 1 ? 'Chẵn' : 'Lẻ';
    return {
      delta: thang ? cuoc : -cuoc,
      detail: `${dong.join('')} → ${tenRa}`,
      mat: [ra, ...dong],
      ke: thang
        ? `Mở bát ra ${tenRa} (${ngua} mặt ngửa). Bạn thắng, được ${cuoc} điểm!`
        : `Mở bát ra ${tenRa} (${ngua} mặt ngửa). Bạn thua, mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/soc-dia');
  return r;
}

// ─────────────────────────── Đập trứng ───────────────────────────

export async function choiDapTrung(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const chon = Number(formData.get('trung'));
  if (!Number.isInteger(chon) || chon < 0 || chon >= TRUNG_SO) {
    return { error: 'Chọn một quả trứng đã nào.' };
  }
  const cuoc = docCuoc(formData, TRUNG_MIN, TRUNG_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'DAPTRUNG', cuoc, () => {
    const co = tung(TRUNG_SO) - 1;
    const vang = tung(TRUNG_SO) - 1;
    const trung = chon === co;
    const anVang = trung && chon === vang;
    const boi = anVang ? TRUNG_BOI_VANG : TRUNG_BOI;
    return {
      delta: trung ? cuoc * boi : -cuoc,
      detail: `chọn ${chon}, quà ở ${co}, vàng ở ${vang}`,
      mat: [co, vang],
      ke: anVang
        ? `Quả ${co} có quà, mà lại đúng quả vàng! Ăn ${boi}×: +${cuoc * boi} điểm!`
        : trung
          ? `Quả ${co} có quà. Ăn ${boi}×: +${cuoc * boi} điểm!`
          : `Quà nằm ở quả ${co}. Bạn đập trượt, mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/dap-trung');
  return r;
}

// ─────────────────────────── Sút phạt ───────────────────────────

export async function choiSutPhat(_prev: GameState, formData: FormData): Promise<GameState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const goc = Number(formData.get('goc'));
  if (!SUT_GOC.some((g) => g.id === goc)) return { error: 'Chọn góc sút đã nào.' };
  const cuoc = docCuoc(formData, SUT_MIN, SUT_MAX);
  if (typeof cuoc === 'string') return { error: cuoc };

  const r = await choiMotVan(me.userId, 'SUTPHAT', cuoc, () => {
    const thu = tung(SUT_GOC.length);
    const vao = thu !== goc;
    const thuong = sutThuong(cuoc);
    const tenThu = SUT_GOC.find((g) => g.id === thu)!.ten.toLowerCase();
    return {
      delta: vao ? thuong : -cuoc,
      detail: `sút ${goc}, thủ môn ${thu}`,
      mat: [thu, vao ? 1 : 0],
      ke: vao
        ? `Thủ môn bay ${tenThu} — bóng vào lưới! Được ${thuong} điểm.`
        : `Thủ môn bay ${tenThu}, đúng hướng bạn sút. Bị bắt, mất ${cuoc} điểm.`,
    };
  });
  revalidatePath('/giai-tri/sut-phat');
  return r;
}
