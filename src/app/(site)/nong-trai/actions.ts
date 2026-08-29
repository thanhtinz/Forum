'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import {
  HAT_MUA_TOI_DA, KHE_CHU_KY_MS, KHE_MAX, KHE_MIN, O_DAT_BAN_DAU, O_DAT_TOI_DA,
  PHAN_GIA, PHAN_THEM, TUOI_RUT_NGAN, giaMoODat,
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

// ─────────────────────────── Xới đất ───────────────────────────

/**
 * Xới ô đất cho tơi. Miễn phí, nhưng phải xới rồi mới gieo được.
 *
 * Ghi có điều kiện `tilled: false` chứ không đọc rồi mới ghi: hai tab cùng
 * bấm thì tab sau thấy `count === 0` — không sao cả, đất đã tơi rồi, chỉ là
 * đừng kể lại là vừa xới xong lần nữa.
 */
export async function xoiDat(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  if (o == null) return { error: 'Chọn ô đất đã nào.' };

  const xong = await db.farmPlot.updateMany({
    where: { userId: me.userId, index: o, cropId: null, tilled: false },
    data: { tilled: true },
  });
  if (xong.count === 0) return { error: 'Ô này xới rồi, hoặc đang có cây.' };

  lamMoi();
  return { ok: true, ke: `Đã xới ô ${o + 1}, gieo hạt được rồi.` };
}

// ─────────────────────────── Mua hạt giống ───────────────────────────

/**
 * Mua hạt về túi. Mua và gieo là HAI việc tách rời.
 *
 * Trước đây gieo hạt trừ điểm luôn, nên cửa hàng phải mở ra đúng lúc đứng
 * trước ô đất. Tách ra thì người chơi mua sẵn một nắm hạt lúc rảnh, rồi gieo
 * lúc nào cũng được mà không phải mở cửa hàng lần nữa.
 */
export async function muaHat(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const cropId = String(formData.get('cay') ?? '').trim();
  const so = docSo(formData.get('so_luong')) ?? 1;
  if (!cropId) return { error: 'Chọn một giống đã nào.' };
  if (so < 1 || so > HAT_MUA_TOI_DA) {
    return { error: `Mỗi lượt mua được 1 tới ${HAT_MUA_TOI_DA} gói thôi.` };
  }

  const cay = await db.farmCrop.findFirst({
    where: { id: cropId, active: true },
    select: { id: true, name: true, seedCost: true },
  });
  if (!cay) return { error: 'Cửa hàng không còn bán giống này.' };

  const tien = cay.seedCost * so;

  try {
    await db.$transaction(async (tx) => {
      // Trừ tiền TRƯỚC: `grantPoints` ném lỗi khi thiếu điểm, mà cả khối nằm
      // trong một transaction nên hạt cũng không được ghi vào túi.
      await grantPoints({
        userId: me.userId, amount: -tien, reason: 'FARM_SEED',
        note: `Mua ${so} hạt ${cay.name}`,
      }, tx);

      await tx.farmSeed.upsert({
        where: { userId_cropId: { userId: me.userId, cropId: cay.id } },
        create: { userId: me.userId, cropId: cay.id, qty: so },
        update: { qty: { increment: so } },
        select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ ${tien} điểm để mua ${so} hạt ${cay.name}.` };
    }
    return { error: 'Không mua được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Đã mua ${so} hạt ${cay.name} về túi.` };
}

// ─────────────────────────── Gieo hạt ───────────────────────────

/**
 * Gieo một hạt ĐÃ CÓ TRONG TÚI xuống một ô trống. Không đụng tới điểm.
 *
 * Hai câu ghi đều là ghi CÓ ĐIỀU KIỆN, và thứ tự có lý do: rút hạt khỏi túi
 * trước (`qty: { gte: 1 }`), rồi mới xuống giống (`cropId: null`). Ngược lại
 * thì hai tab cùng gieo một hạt cuối xuống hai ô khác nhau — cả hai ô đều
 * thấy mình trống, cả hai cùng khớp, mà trong túi chỉ có một hạt.
 */
export async function gieoHat(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  const cropId = String(formData.get('cay') ?? '').trim();
  if (o == null || !cropId) return { error: 'Chọn ô đất và loại cây đã nào.' };

  const cay = await db.farmCrop.findFirst({
    where: { id: cropId, active: true },
    select: { id: true, name: true, growMinutes: true },
  });
  if (!cay) return { error: 'Không còn giống này nữa.' };

  try {
    await db.$transaction(async (tx) => {
      const rut = await tx.farmSeed.updateMany({
        where: { userId: me.userId, cropId: cay.id, qty: { gte: 1 } },
        data: { qty: { decrement: 1 } },
      });
      if (rut.count === 0) throw new Error('het-hat');

      const now = new Date();
      const readyAt = new Date(now.getTime() + cay.growMinutes * 60_000);

      // `cropId: null` và `tilled: true` đều là điều kiện: ô đã có cây, hay ô
      // chưa xới, thì không câu nào khớp.
      const xuong = await tx.farmPlot.updateMany({
        where: { userId: me.userId, index: o, cropId: null, tilled: true },
        data: { cropId: cay.id, plantedAt: now, readyAt, watered: false, fertilized: false },
      });
      if (xuong.count === 0) throw new Error('o-ban');
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'het-hat') {
      return { error: `Trong túi hết hạt ${cay.name} rồi — ghé cửa hàng mua thêm đã.` };
    }
    if (e instanceof Error && e.message === 'o-ban') {
      return { error: 'Ô này đang có cây, hoặc chưa xới đất.' };
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

// ─────────────────────────── Bón phân ───────────────────────────

/**
 * Bón phân cho ô đang có cây: mất điểm, đổi lấy thêm quả lúc thu.
 *
 * Trừ tiền và đánh dấu đã bón nằm chung một transaction, và câu đánh dấu là
 * ghi CÓ ĐIỀU KIỆN (`fertilized: false`) đặt TRƯỚC lúc trừ tiền — hai tab
 * cùng bấm thì tab sau không khớp, ném lỗi, nên không trả tiền hai lần cho
 * một lần bón.
 */
export async function bonPhan(_prev: FarmState, formData: FormData): Promise<FarmState> {
  const me = await nhaNong();
  if ('error' in me) return { error: me.error };

  const o = docSo(formData.get('o'));
  if (o == null) return { error: 'Chọn ô đất đã nào.' };

  try {
    await db.$transaction(async (tx) => {
      const danh = await tx.farmPlot.updateMany({
        where: {
          userId: me.userId, index: o,
          cropId: { not: null }, fertilized: false,
        },
        data: { fertilized: true },
      });
      if (danh.count === 0) throw new Error('khong-bon-duoc');

      await grantPoints({
        userId: me.userId, amount: -PHAN_GIA, reason: 'FARM_SEED',
        note: `Bón phân ô ${o + 1}`,
      }, tx);
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ ${PHAN_GIA} điểm để mua phân bón.` };
    }
    if (e instanceof Error && e.message === 'khong-bon-duoc') {
      return { error: 'Ô này bón rồi, hoặc đang trống.' };
    }
    return { error: 'Không bón được lúc này, thử lại nhé.' };
  }

  lamMoi();
  return { ok: true, ke: `Đã bón phân ô ${o + 1}, vụ này thu thêm ${PHAN_THEM} quả.` };
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
          watered: true, fertilized: true,
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
        // `tilled: false`: thu xong đất chai lại, vụ sau phải xới từ đầu —
        // đó là thứ khép vòng năm việc thành một vòng lặp thật.
        data: {
          cropId: null, plantedAt: null, readyAt: null,
          watered: false, fertilized: false, tilled: false,
        },
      });
      if (don.count === 0) throw new Error('chua-chin');

      // Tưới thì được mùa, không tưới thì chỉ được phần tối thiểu; bón phân
      // cộng thêm một phần cố định nữa.
      const soLuong = (cu.watered ? cu.crop.yieldMax : cu.crop.yieldMin)
        + (cu.fertilized ? PHAN_THEM : 0);
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

      /*
       * Dựng mảnh đất khởi điểm ngay tại đây nếu chưa có.
       *
       * `moDatKhoiDiem` (bốn ô tặng) chỉ chạy trong `xemNongTrai`, tức là chỉ
       * khi có người MỞ TRANG. Nhưng hàm này là một endpoint POST công khai,
       * gọi thẳng được — và lúc ấy `soO = 0` nên `giaMoODat(0)` ra 0, tức là
       * ô đầu tiên miễn phí, `grantPoints` thoát sớm và không ghi sổ điểm nào.
       *
       * Nó không sinh lợi cho ai (gọi thế là tự mất ba ô tặng), nhưng đây đúng
       * kiểu hàm tin rằng "trang đã chạy trước" — thứ mà một endpoint công khai
       * không bao giờ được tin.
       */
      let soO = await tx.farmPlot.count({ where: { userId: me.userId } });
      if (soO === 0) {
        await tx.farmPlot.createMany({
          data: Array.from({ length: O_DAT_BAN_DAU }, (_, index) => ({ userId: me.userId, index })),
          skipDuplicates: true,
        });
        soO = await tx.farmPlot.count({ where: { userId: me.userId } });
      }

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
