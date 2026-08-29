'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import {
  KHE_CHU_KY_MS, KHE_MAX, KHE_MIN, O_DAT_TOI_DA, TUOI_RUT_NGAN, giaMoODat,
} from '@/lib/farm-const';

/**
 * Việc nhà nông — sáu thao tác đổi dữ liệu của nông trại.
 *
 * Cả sáu đều là "đọc rồi mới ghi", nên cả sáu đều phải tự chống hai tab bấm
 * cùng lúc. Cách chống ở đây có hai kiểu, dùng kiểu nào là tuỳ việc:
 *
 *  • GHI CÓ ĐIỀU KIỆN (`updateMany` kèm `where` mô tả trạng thái cũ) — khi
 *    chính hàng bị sửa là bằng chứng của việc đã làm. Thu hoạch dùng kiểu này:
 *    câu lệnh dọn ô CHỈ khớp khi ô còn cây và đã tới giờ, nên hai luồng cùng
 *    bấm thì luồng sau thấy `count === 0` và không có nông sản nào vào kho.
 *
 *  • KHOÁ HÀNG NGƯỜI DÙNG (`lockUsers`) — khi luật nằm ở phép ĐẾM trên nhiều
 *    hàng, thứ mà một câu `where` không nói được. Mở ô đất dùng kiểu này: điều
 *    kiện là "đang có ít hơn mười hai ô", đếm xong mới tạo.
 */

export interface FarmState {
  ok?: boolean;
  error?: string;
  /** Câu kể lại việc vừa làm, in ngay trên trang. */
  ke?: string;
}

/** Người chơi hợp lệ: đã đăng nhập và không bị cấm. */
async function nhaNong(): Promise<{ userId: string } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để ra đồng.' };
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chơi nông trại') };
  return { userId };
}

/** Dựng lại trang sau mỗi việc — mọi con số trên trang đều vừa đổi. */
function lamMoi(): void {
  revalidatePath('/nong-trai');
}

/** Đọc một số nguyên dương từ biểu mẫu. */
function docSo(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? '').trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

// ─────────────────────────── Gieo hạt ───────────────────────────

/**
 * Gieo một loại cây xuống một ô trống.
 *
 * Dọn ô trước, trả tiền sau — nhưng cả hai trong một transaction, nên thiếu
 * điểm là `grantPoints` ném lỗi và ô quay về trống như chưa có gì xảy ra.
 * Ngược lại (trả tiền trước) thì mỗi lần bấm nhầm vào ô đã có cây là mất tiền.
 */
export async function gieoHat(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  const cropId = String(formData.get('cay') ?? '').trim();
  if (o == null || !cropId) return { error: 'Chọn ô đất và loại cây đã nào.' };

  const cay = await db.farmCrop.findFirst({
    where: { id: cropId, active: true },
    select: { id: true, name: true, seedCost: true, growMinutes: true },
  });
  if (!cay) return { error: 'Cửa hàng không còn bán giống này.' };

  try {
    await db.$transaction(async (tx) => {
      const now = new Date();
      const readyAt = new Date(now.getTime() + cay.growMinutes * 60_000);

      // `cropId: null` là điều kiện: ô đã có cây thì không câu nào khớp.
      const xuong = await tx.farmPlot.updateMany({
        where: { userId: me.userId, index: o, cropId: null },
        data: { cropId: cay.id, plantedAt: now, readyAt, watered: false },
      });
      if (xuong.count === 0) throw new Error('o-ban');

      await grantPoints({
        userId: me.userId, amount: -cay.seedCost, reason: 'FARM_SEED',
        refId: cay.id, note: `Mua hạt ${cay.name}`,
      }, tx);
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ ${cay.seedCost} điểm để mua hạt ${cay.name}.` };
    }
    if (e instanceof Error && e.message === 'o-ban') {
      return { error: 'Ô này đang có cây rồi, chọn ô khác nhé.' };
    }
    return { error: 'Không gieo được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Đã gieo ${cay.name} xuống ô ${o + 1}.` };
}

// ─────────────────────────── Tưới nước ───────────────────────────

/**
 * Tưới ô đất: miễn phí, mỗi vụ một lần.
 *
 * Ghi có điều kiện theo ĐÚNG mốc chín vừa đọc được (`readyAt: cu.readyAt`):
 * hai tab cùng tưới thì tab sau thấy mốc đã đổi, không khớp, và không rút ngắn
 * lần thứ hai. Cột `watered` một mình không đủ — nó cũng đúng là điều kiện,
 * nhưng kèm mốc thì câu lệnh tự nói ra là nó đang sửa đúng cái vụ nó vừa đọc.
 */
export async function tuoiNuoc(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  if (o == null) return { error: 'Chọn ô đất đã nào.' };

  const cu = await db.farmPlot.findUnique({
    where: { userId_index: { userId: me.userId, index: o } },
    select: { readyAt: true, watered: true, cropId: true },
  });
  if (!cu || !cu.cropId || !cu.readyAt) return { error: 'Ô này chưa có gì để tưới.' };
  if (cu.watered) return { error: 'Ô này tưới rồi, mỗi vụ chỉ tưới được một lần.' };

  const now = Date.now();
  const conLai = cu.readyAt.getTime() - now;
  if (conLai <= 0) return { error: 'Cây chín rồi, thu hoạch đi thôi.' };

  const moi = new Date(now + Math.ceil(conLai * (1 - TUOI_RUT_NGAN)));
  const xong = await db.farmPlot.updateMany({
    where: { userId: me.userId, index: o, watered: false, readyAt: cu.readyAt },
    data: { watered: true, readyAt: moi },
  });
  if (xong.count === 0) return { error: 'Ô này vừa được tưới rồi.' };

  lamMoi();
  return { ok: true, ke: `Đã tưới ô ${o + 1} — chín sớm hơn và được mùa hơn.` };
}

// ─────────────────────────── Thu hoạch ───────────────────────────

/**
 * Thu hoạch một ô đã chín.
 *
 * Dọn ô là bước CHỐT: `updateMany` chỉ khớp khi ô còn cây và `readyAt` đã qua,
 * nên hai luồng cùng bấm thì chỉ một luồng dọn được ô, luồng kia thấy
 * `count === 0` và dừng trước khi kịp bỏ gì vào kho. Không có đường nào thu
 * hoạch hai lần một vụ.
 */
export async function thuHoach(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  if (o == null) return { error: 'Chọn ô đất đã nào.' };

  let ke = '';
  try {
    await db.$transaction(async (tx) => {
      const cu = await tx.farmPlot.findUnique({
        where: { userId_index: { userId: me.userId, index: o } },
        select: {
          watered: true,
          crop: { select: { id: true, name: true, yieldMin: true, yieldMax: true } },
        },
      });
      if (!cu?.crop) throw new Error('trong');

      const now = new Date();
      const don = await tx.farmPlot.updateMany({
        where: {
          userId: me.userId, index: o,
          cropId: cu.crop.id, readyAt: { lte: now },
        },
        data: { cropId: null, plantedAt: null, readyAt: null, watered: false },
      });
      if (don.count === 0) throw new Error('chua-chin');

      // Tưới thì được mùa, không tưới thì chỉ được phần tối thiểu.
      const soLuong = cu.watered ? cu.crop.yieldMax : cu.crop.yieldMin;
      await tx.farmBarn.upsert({
        where: { userId_cropId: { userId: me.userId, cropId: cu.crop.id } },
        create: { userId: me.userId, cropId: cu.crop.id, qty: soLuong },
        update: { qty: { increment: soLuong } },
        select: { id: true },
      });

      ke = `Thu được ${soLuong} ${cu.crop.name} vào nhà kho.`;
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'trong') return { error: 'Ô này đang trống.' };
    if (e instanceof Error && e.message === 'chua-chin') {
      return { error: 'Ô này chưa chín, hoặc vừa có người thu mất rồi.' };
    }
    return { error: 'Không thu hoạch được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke };
}

// ─────────────────────────── Bán nông sản ───────────────────────────

/**
 * Bán nông sản trong kho lấy điểm.
 *
 * Trừ kho bằng `updateMany` có điều kiện `qty >= n`: bán hai tab cùng lúc thì
 * tab sau không đủ hàng để khớp, nên không thể bán một quả táo hai lần.
 */
export async function banNongSan(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const cropId = String(formData.get('cay') ?? '').trim();
  const soLuong = docSo(formData.get('so_luong'));
  if (!cropId || !soLuong || soLuong < 1) return { error: 'Chọn nông sản và số lượng muốn bán.' };

  const cay = await db.farmCrop.findUnique({
    where: { id: cropId },
    select: { name: true, sellPrice: true },
  });
  if (!cay) return { error: 'Không có loại nông sản này.' };

  const tien = cay.sellPrice * soLuong;
  try {
    await db.$transaction(async (tx) => {
      const bot = await tx.farmBarn.updateMany({
        where: { userId: me.userId, cropId, qty: { gte: soLuong } },
        data: { qty: { decrement: soLuong } },
      });
      if (bot.count === 0) throw new Error('thieu-hang');

      await grantPoints({
        userId: me.userId, amount: tien, reason: 'FARM_SELL',
        refId: cropId, note: `Bán ${soLuong} ${cay.name}`,
      }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'thieu-hang') {
      return { error: `Trong kho không đủ ${soLuong} ${cay.name}.` };
    }
    return { error: 'Không bán được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Bán ${soLuong} ${cay.name}, được ${tien} điểm.` };
}

// ─────────────────────────── Mở thêm ô đất ───────────────────────────

/**
 * Mua thêm một ô đất.
 *
 * Luật là phép ĐẾM ("đang có mấy ô") nên `where` không nói hộ được — phải khoá
 * hàng người dùng để hai tab nối đuôi nhau, tab sau đếm được đúng số ô tab
 * trước vừa tạo. Không khoá thì cả hai cùng đếm bốn, cùng tạo ô số 4, một
 * trong hai đụng ràng buộc `@@unique` và người chơi mất tiền vô cớ.
 */
export async function moODat(_prev: FarmState, _formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  let gia = 0;
  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId);

      const soO = await tx.farmPlot.count({ where: { userId: me.userId } });
      if (soO >= O_DAT_TOI_DA) throw new Error('kich-tran');
      gia = giaMoODat(soO);

      await tx.farmPlot.create({
        data: { userId: me.userId, index: soO },
        select: { id: true },
      });
      await grantPoints({
        userId: me.userId, amount: -gia, reason: 'FARM_PLOT',
        note: `Mở ô đất thứ ${soO + 1}`,
      }, tx);
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Bạn chưa đủ ${gia} điểm để mở ô này.` };
    if (e instanceof Error && e.message === 'kich-tran') {
      return { error: `Nông trại tối đa ${O_DAT_TOI_DA} ô, bạn mở hết rồi.` };
    }
    return { error: 'Không mở được ô đất lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Đã mở thêm một ô đất, trả ${gia} điểm.` };
}

// ─────────────────────────── Cây khế ───────────────────────────

/**
 * Hái cây khế: mỗi giờ một lần, được 1–3 điểm, không mất gì.
 *
 * Chỗ dựa cho người mới — chưa có điểm nào cũng bắt đầu được. Mốc "một giờ"
 * chính là điều kiện của câu ghi: `updateMany` chỉ khớp khi `lastTreeAt` còn
 * cũ hơn một giờ, nên bấm mười lần liên tiếp thì chín lần sau không khớp.
 */
export async function haiCayKhe(_prev: FarmState, _formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const now = new Date();
  const han = new Date(now.getTime() - KHE_CHU_KY_MS);
  const duoc = KHE_MIN + Math.floor(Math.random() * (KHE_MAX - KHE_MIN + 1));

  try {
    await db.$transaction(async (tx) => {
      const hai = await tx.user.updateMany({
        where: {
          id: me.userId,
          OR: [{ lastTreeAt: null }, { lastTreeAt: { lte: han } }],
        },
        data: { lastTreeAt: now },
      });
      if (hai.count === 0) throw new Error('chua-toi-gio');

      await grantPoints({
        userId: me.userId, amount: duoc, reason: 'FARM_TREE', note: 'Hái cây khế',
      }, tx);
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'chua-toi-gio') {
      return { error: 'Cây khế chưa ra quả, giờ sau ghé lại nhé.' };
    }
    return { error: 'Không hái được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Hái được ${duoc} quả khế, đổi lấy ${duoc} điểm.` };
}
