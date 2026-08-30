'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBan, banMessage } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import {
  CAU_DAU, CHIEU_DAU, CO_HOI_BAT, CONG_MOI_CAP, EXP_DAU, EXP_MOI_CAP, GIA_CAU, GIA_DA,
  MAU_DAU, MUA_TOI_DA, SK_DAU, SK_MOI_TRAN, TEN_TOI_DA, TEN_TOI_THIEU, THU_DAU, VANG_DAU,
  YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS,
  DAU_CAP_MAX, DAU_CAP_MIN, DAU_EXP, DAU_HAN_MS, DAU_VANG, NGOC_MOI_DA,
  boThu, capTheoExp, capVaoKhu, gymDuocVao, laGioVang, nacTienHoaMoi, satThuongDau,
  timKhu, tinhSatThuong,
} from '@/lib/pokemon-const';
import { chotDauQuaHan, traThuong } from '@/lib/pokemon-dau';

export interface PokeState { ok?: boolean; error?: string; ke?: string }

/**
 * Người chơi hợp lệ.
 *
 * Mỗi hàm trong tệp này là một endpoint POST công khai, nên hàm nào cũng phải
 * tự kiểm lại từ đầu — không hàm nào được tin là hàm gọi trước đã kiểm hộ.
 */
async function nguoiChoi() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để chơi.' as const };
  const cam = await getActiveBan(userId, 'COMMENT');
  if (cam) return { error: banMessage(cam, 'chơi Đảo Pokémon') };
  return { userId };
}

/** Nhân vật của người đang đăng nhập, hoặc lỗi. */
async function layNhanVat() {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };
  const nv = await db.pokeNhanVat.findUnique({ where: { userId: me.userId } });
  if (!nv) return { error: 'Bạn chưa tạo nhân vật.' as const };
  return { userId: me.userId, nv };
}

// ─────────────────────────── Tạo nhân vật ───────────────────────────

export async function taoNhanVat(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const ten = String(fd.get('ten') ?? '').trim();
  if (ten.length < TEN_TOI_THIEU || ten.length > TEN_TOI_DA) {
    return { error: `Tên nhân vật dài ${TEN_TOI_THIEU}–${TEN_TOI_DA} ký tự.` };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(ten)) {
    return { error: 'Tên nhân vật chỉ gồm chữ không dấu, số, gạch ngang và gạch dưới.' };
  }

  const nguon = Number(fd.get('thu'));
  const dau = THU_DAU.find((t) => t.nguon === nguon);
  if (!dau) return { error: 'Chọn một con thú khởi đầu đã nào.' };

  try {
    await db.$transaction(async (tx) => {
      // Mỗi tài khoản đúng một nhân vật. `userId` là khoá duy nhất nên hai tab
      // bấm cùng lúc thì tab sau vỡ ở đây chứ không tạo được nhân vật thứ hai.
      const nv = await tx.pokeNhanVat.create({
        data: {
          userId: me.userId, ten,
          vang: VANG_DAU, exp: EXP_DAU, sk: SK_DAU, skToiDa: SK_DAU, cau: CAU_DAU,
        },
        select: { id: true },
      });
      const thu = await tx.pokeThu.create({
        data: {
          nhanVatId: nv.id, nguon: dau.nguon, ten: dau.ten, he: dau.he,
          nacToiDa: dau.nacToiDa, mau: MAU_DAU, mauToiDa: MAU_DAU,
          c1: CHIEU_DAU, c2: CHIEU_DAU, c3: CHIEU_DAU, c4: CHIEU_DAU,
          chieu: ['TACKLE', 'GROWL', 'QUICK ATTACK', 'BITE'],
        },
        select: { id: true },
      });
      await tx.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: thu.id } });
    });
  } catch (e) {
    const s = String(e);
    if (s.includes('Unique') && s.includes('ten')) return { error: 'Tên nhân vật này có người dùng rồi.' };
    if (s.includes('Unique')) return { error: 'Bạn đã có nhân vật rồi.' };
    return { error: 'Không tạo được nhân vật lúc này.' };
  }

  revalidatePath('/pokemon');
  redirect('/pokemon');
}

// ─────────────────────────── Đi và gặp thú ───────────────────────────

/** Đổi khu đang đứng. */
export async function doiKhu(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const ma = String(fd.get('khu') ?? '');
  const khu = timKhu(ma);
  if (!khu) return { error: 'Khu này không có trên đảo.' };
  if (r.nv.cap < capVaoKhu(khu.bac)) {
    return { error: `${khu.ten} chỉ mở từ cấp ${capVaoKhu(khu.bac)}.` };
  }
  if (await db.pokeTran.findUnique({ where: { nhanVatId: r.nv.id }, select: { id: true } })) {
    return { error: 'Đang đánh dở, xong trận đã rồi hẵng đi.' };
  }

  await db.pokeNhanVat.update({ where: { id: r.nv.id }, data: { khu: ma } });
  revalidatePath('/pokemon');
  return { ok: true, ke: `Bạn tới ${khu.ten}.` };
}

/**
 * Tìm thú trong khu đang đứng.
 *
 * Chỉ số con thú được CHÉP RA bảng trận chứ không trỏ về bảng thú hoang. Bản
 * gốc trừ máu thẳng vào bảng dùng chung, nên hai người cùng đánh một con là
 * trừ máu của nhau, ai bấm sau thì hưởng không.
 */
export async function timThu(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const dang = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id }, select: { id: true } });
  if (dang) return { error: 'Bạn đang đánh dở một con rồi.' };
  if (nv.sk < SK_MOI_TRAN) return { error: 'Thú của bạn kiệt sức, vào trạm y tế nghỉ đã.' };

  const con = await conRaTranHoacLoi(nv.id, nv.raTranId);
  if ('error' in con) return { error: con.error };
  if (con.thu.mau <= 0) return { error: 'Thú của bạn đang bị thương, chữa đã rồi hãy đi.' };

  const soThu = await db.pokeThuHoang.count({ where: { khu: nv.khu } });
  if (soThu === 0) return { error: 'Khu này chưa có con thú nào.' };
  const hoang = await db.pokeThuHoang.findFirst({
    where: { khu: nv.khu },
    skip: Math.floor(Math.random() * soThu),
    orderBy: { goc: 'asc' },
  });
  if (!hoang) return { error: 'Khu này chưa có con thú nào.' };

  await db.pokeTran.create({
    data: {
      nhanVatId: nv.id, khu: nv.khu,
      nguon: hoang.nguon, ten: hoang.ten, he: hoang.he, nac: hoang.nac,
      cong: hoang.cong, thu: hoang.thu, mau: hoang.mau, mauToiDa: hoang.mau,
      exp: hoang.exp, vang: hoang.vang, chieu: hoang.chieu,
    },
    select: { id: true },
  });

  revalidatePath('/pokemon');
  return { ok: true, ke: `Một con ${hoang.ten} hoang nhảy ra!` };
}

async function conRaTranHoacLoi(nhanVatId: string, raTranId: string | null) {
  const thu = raTranId
    ? await db.pokeThu.findFirst({ where: { id: raTranId, nhanVatId } })
    : await db.pokeThu.findFirst({ where: { nhanVatId }, orderBy: { createdAt: 'asc' } });
  if (!thu) return { error: 'Bạn chưa có con thú nào ra trận.' as const };
  return { thu };
}

// ─────────────────────────── Đánh nhau ───────────────────────────

/**
 * Một lượt đánh: mình ra một chiêu, thú hoang đánh trả cùng lượt.
 *
 * Cả lượt nằm gọn trong một giao dịch, và mọi phép ghi đều kèm điều kiện về
 * trạng thái cũ. Bản gốc ghi bằng bốn câu `UPDATE` rời nhau không điều kiện,
 * nên bấm hai tab cùng lúc là đánh hai lượt mà chỉ tốn một lượt thể lực, thắng
 * một con mà nhận thưởng hai lần.
 */
export async function raChieu(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const so = Number(fd.get('chieu'));
  if (![1, 2, 3, 4].includes(so)) return { error: 'Chọn một chiêu đã nào.' };

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);

      const tran = await tx.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
      if (!tran) throw new Error('het-tran');

      const toi = nv.raTranId
        ? await tx.pokeThu.findFirst({ where: { id: nv.raTranId, nhanVatId: nv.id } })
        : await tx.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } });
      if (!toi) throw new Error('khong-co-thu');
      if (toi.mau <= 0) throw new Error('thu-bi-thuong');
      if (nv.sk < SK_MOI_TRAN) throw new Error('het-sk');

      const chieu = [toi.c1, toi.c2, toi.c3, toi.c4][so - 1]!;
      const { gay, chiu } = tinhSatThuong(
        chieu, boThu(toi), toi.he, tran.cong, tran.thu, tran.he,
      );

      const mauDich = Math.max(0, tran.mau - gay);
      const mauToi = Math.max(0, toi.mau - chiu);

      // Trừ thể lực đúng một lần cho mỗi lượt, và chỉ khi thể lực chưa bị ai
      // trừ mất — điều kiện nằm trong `where` chứ không đọc rồi ghi.
      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: nv.id, sk: { gte: SK_MOI_TRAN } },
        data: { sk: { decrement: SK_MOI_TRAN } },
      });
      if (tru.count === 0) throw new Error('het-sk');

      await tx.pokeThu.update({ where: { id: toi.id }, data: { mau: mauToi } });

      const tenChieu = toi.chieu[so - 1] ?? `Chiêu ${so}`;
      let ke = `${toi.ten} dùng ${tenChieu}, ${tran.ten} mất ${gay} máu.`;
      if (gay === 0) ke = `${tran.ten} miễn nhiễm — ${tenChieu} không ăn thua gì.`;

      // ── Thắng ─────────────────────────────────────────────────────────
      if (mauDich <= 0) {
        await tx.pokeTran.delete({ where: { id: tran.id } });
        // Cấp tính LẠI từ tổng kinh nghiệm chứ không cộng dần, nên không có
        // đường nào để cấp lệch khỏi kinh nghiệm dù ghi hụt một lượt.
        const expMoi = nv.exp + tran.exp;
        const capMoi = capTheoExp(expMoi);
        await tx.pokeThu.update({
          where: { id: toi.id }, data: { exp: { increment: tran.exp } },
        });

        // ── Thắng Gym: thưởng riêng, một con thú tặng và một huy chương ──
        if (tran.gym) {
          const gym = await tx.pokeGym.findUnique({ where: { so: tran.gym } });
          if (!gym) throw new Error('khong-co-gym');

          // Ghi huy chương CÓ ĐIỀU KIỆN theo huy chương cũ: hai tab cùng hạ
          // một Gym thì tab sau không cộng thưởng lần nữa.
          const ghi = await tx.pokeNhanVat.updateMany({
            where: { id: nv.id, huyChuong: gym.so - 1 },
            data: {
              vang: { increment: gym.vang }, exp: expMoi, cap: capMoi,
              cau: { increment: gym.cau }, ngoc: { increment: gym.ngoc },
              huyChuong: gym.so,
            },
          });
          if (ghi.count === 0) throw new Error('gym-da-xong');

          await tx.pokeThu.create({
            data: {
              nhanVatId: nv.id, nguon: gym.tangNguon, ten: `Quà ${gym.ten}`, he: gym.he,
              nacToiDa: Math.max(1, gym.tangNac), mau: MAU_DAU, mauToiDa: MAU_DAU,
              c1: CHIEU_DAU, c2: CHIEU_DAU, c3: CHIEU_DAU, c4: CHIEU_DAU,
              chieu: gym.chieu,
            },
            select: { id: true },
          });

          return {
            ok: true,
            ke: `${ke} Bạn hạ được ${gym.ten}! Nhận ${gym.vang} vàng, ${gym.exp} kinh nghiệm, `
              + `${gym.cau} quả cầu, ${gym.ngoc} ngọc, một con thú và huy chương thứ ${gym.so}.`
              + (capMoi > nv.cap ? ` Bạn lên cấp ${capMoi}!` : ''),
          };
        }

        await tx.pokeNhanVat.update({
          where: { id: nv.id },
          data: { vang: { increment: tran.vang }, exp: expMoi, cap: capMoi },
        });
        return {
          ok: true,
          ke: `${ke} ${tran.ten} gục! Bạn được ${tran.vang} vàng và ${tran.exp} kinh nghiệm.`
            + (capMoi > nv.cap ? ` Bạn lên cấp ${capMoi}!` : ''),
        };
      }

      ke += ` ${tran.ten} đánh trả, ${toi.ten} mất ${chiu} máu.`;

      // ── Thú mình gục ──────────────────────────────────────────────────
      if (mauToi <= 0) {
        await tx.pokeTran.delete({ where: { id: tran.id } });
        return { ok: true, ke: `${ke} ${toi.ten} gục mất rồi, mang vào trạm y tế thôi.` };
      }

      await tx.pokeTran.update({ where: { id: tran.id }, data: { mau: mauDich, ke } });
      return { ok: true, ke };
    });

    revalidatePath('/pokemon');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'het-tran') return { error: 'Trận này xong rồi.' };
    if (m === 'het-sk') return { error: 'Hết thể lực, vào trạm y tế nghỉ đã.' };
    if (m === 'thu-bi-thuong') return { error: 'Thú của bạn đã gục, chữa đã.' };
    if (m === 'khong-co-thu') return { error: 'Bạn chưa có con thú nào ra trận.' };
    if (m === 'gym-da-xong') return { error: 'Gym này đã được ghi nhận rồi.' };
    if (m === 'khong-co-gym') return { error: 'Gym này không còn trên đảo.' };
    return { error: 'Không đánh được lúc này, thử lại nhé.' };
  }
}

/** Bỏ chạy khỏi trận. */
export async function boChay(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  await db.pokeTran.deleteMany({ where: { nhanVatId: r.nv.id } });
  revalidatePath('/pokemon');
  return { ok: true, ke: 'Bạn bỏ chạy.' };
}

// ─────────────────────────── Bắt thú ───────────────────────────

/**
 * Ném cầu. Bản gốc: `rand(0,5)==1`, tức một phần sáu, không phụ thuộc máu con
 * thú — giữ nguyên tỉ lệ ấy.
 *
 * TRỪ CẦU TRƯỚC rồi mới quay số. Bản gốc làm ngược: bắt trúng thì chèn con thú
 * mới mà QUÊN trừ cầu, chỉ trừ khi bắt trượt — ném trúng liên tục là số cầu
 * không hề giảm.
 */
export async function nemCau(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);

      const tran = await tx.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
      if (!tran) throw new Error('het-tran');
      // Gym là chủ Gym chứ không phải thú hoang — không bắt được.
      if (tran.gym) throw new Error('la-gym');

      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: nv.id, cau: { gte: 1 } },
        data: { cau: { decrement: 1 } },
      });
      if (tru.count === 0) throw new Error('het-cau');

      if (Math.random() >= CO_HOI_BAT) {
        return { ok: true, ke: `Cầu bật ra, ${tran.ten} vẫn đứng đó. Bạn mất một quả cầu.` };
      }

      // Con bắt được bắt đầu lại từ vạch xuất phát: 20 máu, bốn chiêu 10 sát
      // thương — y bản gốc, chứ không giữ chỉ số khủng của con hoang.
      await tx.pokeThu.create({
        data: {
          nhanVatId: nv.id, nguon: tran.nguon, ten: tran.ten, he: tran.he,
          nacToiDa: Math.max(1, tran.nac), mau: MAU_DAU, mauToiDa: MAU_DAU,
          c1: CHIEU_DAU, c2: CHIEU_DAU, c3: CHIEU_DAU, c4: CHIEU_DAU,
          chieu: tran.chieu,
        },
        select: { id: true },
      });
      await tx.pokeTran.delete({ where: { id: tran.id } });
      return { ok: true, ke: `Bắt được ${tran.ten}! Nó đã vào kho của bạn.` };
    });

    revalidatePath('/pokemon');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'het-tran') return { error: 'Không có con nào trước mặt.' };
    if (m === 'het-cau') return { error: 'Bạn hết quả cầu rồi, ra cửa hàng mua thêm.' };
    if (m === 'la-gym') return { error: 'Đây là chủ Gym, không bắt được.' };
    return { error: 'Không ném được lúc này, thử lại nhé.' };
  }
}

// ─────────────────────────── Kho thú ───────────────────────────

export async function choRaTran(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const id = String(fd.get('thu') ?? '');
  // Quyền nằm trong `where`: con thú phải thuộc đúng nhân vật này.
  const thu = await db.pokeThu.findFirst({
    where: { id, nhanVatId: r.nv.id }, select: { id: true, ten: true },
  });
  if (!thu) return { error: 'Đó không phải thú của bạn.' };

  if (await db.pokeTran.findUnique({ where: { nhanVatId: r.nv.id }, select: { id: true } })) {
    return { error: 'Đang giữa trận, không đổi thú được.' };
  }

  await db.pokeNhanVat.update({ where: { id: r.nv.id }, data: { raTranId: thu.id } });
  revalidatePath('/pokemon');
  return { ok: true, ke: `${thu.ten} ra trận.` };
}

/**
 * Dùng một viên đá tiến cấp.
 *
 * Bản gốc đòi `exp >= 1000` rồi lại ghi `exp = exp * 3` — nhân lên thay vì trừ
 * đi, nên qua lần đầu là ngưỡng vĩnh viễn thoả. Đó là gõ nhầm chứ không phải
 * luật, ở đây TRỪ đúng 1000.
 */
export async function dungDa(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('thu') ?? '');

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);

      const thu = await tx.pokeThu.findFirst({ where: { id, nhanVatId: r.nv.id } });
      if (!thu) throw new Error('khong-phai-cua-ban');
      if (thu.exp < EXP_MOI_CAP) throw new Error('thieu-exp');

      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, da: { gte: 1 } }, data: { da: { decrement: 1 } },
      });
      if (tru.count === 0) throw new Error('het-da');

      const capMoi = thu.cap + 1;
      const nacMoi = nacTienHoaMoi(capMoi, thu.nac, thu.nacToiDa);

      await tx.pokeThu.update({
        where: { id: thu.id },
        data: {
          cap: capMoi,
          exp: { decrement: EXP_MOI_CAP },
          c1: { increment: CONG_MOI_CAP }, c2: { increment: CONG_MOI_CAP },
          c3: { increment: CONG_MOI_CAP }, c4: { increment: CONG_MOI_CAP },
          mauToiDa: { increment: CONG_MOI_CAP },
          mau: { increment: CONG_MOI_CAP },
          ...(nacMoi ? { nac: nacMoi } : {}),
        },
      });

      return {
        ok: true,
        ke: nacMoi
          ? `${thu.ten} lên cấp ${capMoi} và TIẾN HOÁ lên nấc ${nacMoi}!`
          : `${thu.ten} lên cấp ${capMoi}.`,
      };
    });
    revalidatePath('/pokemon');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-phai-cua-ban') return { error: 'Đó không phải thú của bạn.' };
    if (m === 'thieu-exp') return { error: `Con này cần ${EXP_MOI_CAP} kinh nghiệm mới lên cấp được.` };
    if (m === 'het-da') return { error: 'Bạn không có đá tiến cấp nào.' };
    return { error: 'Không dùng được lúc này, thử lại nhé.' };
  }
}

/** Thả một con về tự nhiên. Không thả con cuối cùng, cũng không thả con ra trận. */
export async function thaThu(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('thu') ?? '');

  const thu = await db.pokeThu.findFirst({ where: { id, nhanVatId: r.nv.id }, select: { id: true, ten: true } });
  if (!thu) return { error: 'Đó không phải thú của bạn.' };
  if (r.nv.raTranId === thu.id) return { error: 'Con này đang ra trận, đổi con khác đã.' };
  if ((await db.pokeThu.count({ where: { nhanVatId: r.nv.id } })) <= 1) {
    return { error: 'Đây là con cuối cùng, thả nốt thì lấy gì mà đánh.' };
  }

  await db.pokeThu.delete({ where: { id: thu.id } });
  revalidatePath('/pokemon');
  return { ok: true, ke: `${thu.ten} đã được thả về tự nhiên.` };
}

// ─────────────────────────── Trạm y tế ───────────────────────────

/**
 * Chữa: `kieu` = 'mau' hồi 20 máu, 'sk' hồi 10 thể lực.
 *
 * Bản gốc dùng CHUNG một mốc thời gian cho cả hai nhưng đặt hai quãng chờ khác
 * nhau (5 phút và 2 phút) — giữ nguyên, vì tách ra hai mốc là đổi hẳn nhịp
 * chơi chứ không phải sửa lỗi.
 */
export async function chuaTri(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const kieu = String(fd.get('kieu') ?? '');
  if (kieu !== 'mau' && kieu !== 'sk') return { error: 'Chọn cách chữa đã nào.' };
  const cho = kieu === 'mau' ? YTE_MAU_CHO_MS : YTE_SK_CHO_MS;

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);
      const moc = new Date(Date.now() - cho);

      if (kieu === 'sk') {
        const nv = await tx.pokeNhanVat.findUnique({
          where: { id: r.nv.id }, select: { sk: true, skToiDa: true },
        });
        if (!nv) throw new Error('khong-co');
        if (nv.sk >= nv.skToiDa) throw new Error('con-khoe');

        const xong = await tx.pokeNhanVat.updateMany({
          where: {
            id: r.nv.id,
            OR: [{ chuaLuc: null }, { chuaLuc: { lte: moc } }],
          },
          data: { sk: Math.min(nv.skToiDa, nv.sk + YTE_SK), chuaLuc: new Date() },
        });
        if (xong.count === 0) throw new Error('cho-da');
        return { ok: true, ke: `Y tá hồi cho bạn ${YTE_SK} thể lực.` };
      }

      const thu = r.nv.raTranId
        ? await tx.pokeThu.findFirst({ where: { id: r.nv.raTranId, nhanVatId: r.nv.id } })
        : await tx.pokeThu.findFirst({ where: { nhanVatId: r.nv.id }, orderBy: { createdAt: 'asc' } });
      if (!thu) throw new Error('khong-co');
      if (thu.mau >= thu.mauToiDa) throw new Error('con-khoe');

      const xong = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, OR: [{ chuaLuc: null }, { chuaLuc: { lte: moc } }] },
        data: { chuaLuc: new Date() },
      });
      if (xong.count === 0) throw new Error('cho-da');

      await tx.pokeThu.update({
        where: { id: thu.id },
        data: { mau: Math.min(thu.mauToiDa, thu.mau + YTE_MAU) },
      });
      return { ok: true, ke: `Y tá hồi cho ${thu.ten} ${YTE_MAU} máu.` };
    });
    revalidatePath('/pokemon');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'con-khoe') return { error: 'Đang khoẻ, chưa cần chữa.' };
    if (m === 'cho-da') return { error: 'Y tá đang bận với người khác, chờ thêm chút nữa.' };
    if (m === 'khong-co') return { error: 'Bạn chưa có thú nào.' };
    return { error: 'Không chữa được lúc này, thử lại nhé.' };
  }
}

// ─────────────────────────── Cửa hàng ───────────────────────────

export async function muaHang(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const mon = String(fd.get('mon') ?? '');
  if (mon !== 'cau' && mon !== 'da') return { error: 'Chọn món đã nào.' };
  const sl = Number(fd.get('sl'));
  if (!Number.isInteger(sl) || sl < 1 || sl > MUA_TOI_DA) {
    return { error: `Mỗi lượt mua từ 1 đến ${MUA_TOI_DA} món.` };
  }
  const gia = (mon === 'cau' ? GIA_CAU : GIA_DA) * sl;

  // Trừ vàng bằng một câu ghi CÓ ĐIỀU KIỆN: đủ vàng thì mới ghi, nên hai tab
  // bấm cùng lúc không thể tiêu quá số vàng đang có.
  const xong = await db.pokeNhanVat.updateMany({
    where: { id: r.nv.id, vang: { gte: gia } },
    data: {
      vang: { decrement: gia },
      ...(mon === 'cau' ? { cau: { increment: sl } } : { da: { increment: sl } }),
    },
  });
  if (xong.count === 0) return { error: 'Bạn không đủ vàng.' };

  revalidatePath('/pokemon');
  return { ok: true, ke: `Đã mua ${sl} ${mon === 'cau' ? 'quả cầu' : 'viên đá tiến cấp'}, hết ${gia} vàng.` };
}

// ─────────────────────────── Gym ───────────────────────────

/**
 * Vào một Gym. Đánh theo thứ tự: hạ xong Gym n mới vào được Gym n+1.
 */
export async function vaoGym(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const so = Number(fd.get('gym'));
  if (!Number.isInteger(so)) return { error: 'Chọn một Gym đã nào.' };
  if (!gymDuocVao(so, nv.huyChuong)) {
    return nv.huyChuong >= so
      ? { error: `Bạn hạ Gym ${so} rồi.` }
      : { error: `Phải hạ Gym ${nv.huyChuong + 1} trước đã.` };
  }
  if (nv.sk < SK_MOI_TRAN) return { error: 'Thú của bạn kiệt sức, vào trạm y tế nghỉ đã.' };

  const con = await conRaTranHoacLoi(nv.id, nv.raTranId);
  if ('error' in con) return { error: con.error };
  if (con.thu.mau <= 0) return { error: 'Thú của bạn đang bị thương, chữa đã.' };

  const gym = await db.pokeGym.findUnique({ where: { so } });
  if (!gym) return { error: 'Gym này không có trên đảo.' };

  try {
    await db.$transaction(async (tx) => {
      // Kiểm LẠI trong giao dịch: giữa lúc đọc và lúc ghi có thể đã có trận
      // khác được mở ở tab kia.
      const dang = await tx.pokeTran.findUnique({ where: { nhanVatId: nv.id }, select: { id: true } });
      if (dang) throw new Error('dang-danh');
      await tx.pokeTran.create({
        data: {
          nhanVatId: nv.id, khu: nv.khu, gym: gym.so,
          nguon: gym.so, ten: gym.ten, he: gym.he, nac: 1,
          cong: gym.cong, thu: gym.thu, mau: gym.mau, mauToiDa: gym.mau,
          exp: gym.exp, vang: gym.vang, chieu: gym.chieu,
        },
        select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'dang-danh') return { error: 'Bạn đang đánh dở một trận rồi.' };
    return { error: 'Không vào được Gym lúc này.' };
  }

  revalidatePath('/pokemon');
  revalidatePath('/pokemon/gym');
  return { ok: true, ke: `Bạn bước vào ${gym.ten}.` };
}

/** Đổi ngọc lấy đá tiến cấp. */
export async function doiNgoc(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const sl = Number(fd.get('sl'));
  if (!Number.isInteger(sl) || sl < 1 || sl > MUA_TOI_DA) {
    return { error: `Mỗi lượt đổi từ 1 đến ${MUA_TOI_DA} viên.` };
  }
  const can = sl * NGOC_MOI_DA;
  const xong = await db.pokeNhanVat.updateMany({
    where: { id: r.nv.id, ngoc: { gte: can } },
    data: { ngoc: { decrement: can }, da: { increment: sl } },
  });
  if (xong.count === 0) return { error: 'Bạn không đủ ngọc.' };

  revalidatePath('/pokemon/cua-hang');
  return { ok: true, ke: `Đổi ${can} ngọc lấy ${sl} viên đá tiến cấp.` };
}

// ─────────────────────────── Đấu trường ───────────────────────────

/** Mở một kèo. Mỗi nhân vật chỉ giữ một kèo hoặc một trận đấu tại một lúc. */
export async function taoKeo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const min = Number(fd.get('min'));
  const max = Number(fd.get('max'));
  if (!Number.isInteger(min) || !Number.isInteger(max)) return { error: 'Khoảng cấp phải là số nguyên.' };
  if (min < DAU_CAP_MIN || max > DAU_CAP_MAX || min > max) {
    return { error: `Khoảng cấp phải nằm trong ${DAU_CAP_MIN}–${DAU_CAP_MAX} và tối thiểu không lớn hơn tối đa.` };
  }

  const con = await conRaTranHoacLoi(nv.id, nv.raTranId);
  if ('error' in con) return { error: con.error };
  if (con.thu.mau <= 0) return { error: 'Thú của bạn đang bị thương, chữa đã.' };

  await chotDauQuaHan();
  const dangCo = await db.pokeDau.findFirst({
    where: { ketThuc: null, OR: [{ chuId: nv.id }, { doiId: nv.id }] },
    select: { id: true },
  });
  if (dangCo) return { error: 'Bạn đang có một kèo dở rồi.' };

  await db.pokeDau.create({
    data: {
      chuId: nv.id, capMin: min, capMax: max,
      chuTen: con.thu.ten, chuNguon: con.thu.nguon, chuNac: con.thu.nac, chuHe: con.thu.he,
      chuChieu: [con.thu.c1, con.thu.c2, con.thu.c3, con.thu.c4],
      chuTenChieu: con.thu.chieu,
      chuMau: con.thu.mau, chuMauToiDa: con.thu.mauToiDa, chuThuId: con.thu.id,
      hanLuc: new Date(Date.now() + DAU_HAN_MS),
    },
    select: { id: true },
  });

  revalidatePath('/pokemon/dau-truong');
  return { ok: true, ke: `Đã mở kèo cho cấp ${min}–${max}. Kèo sống ${DAU_HAN_MS / 60_000} phút.` };
}

/** Huỷ kèo của mình khi chưa ai nhận. */
export async function huyKeo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const id = String(fd.get('dau') ?? '');
  // Quyền nằm trong `where`: chỉ chủ kèo, chỉ khi chưa ai nhận.
  const xoa = await db.pokeDau.deleteMany({
    where: { id, chuId: r.nv.id, doiId: null, ketThuc: null },
  });
  if (xoa.count === 0) return { error: 'Không huỷ được kèo này — có thể đã có người nhận.' };

  revalidatePath('/pokemon/dau-truong');
  return { ok: true, ke: 'Đã huỷ kèo.' };
}

/** Nhận kèo của người khác. */
export async function vaoKeo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const id = String(fd.get('dau') ?? '');
  const con = await conRaTranHoacLoi(nv.id, nv.raTranId);
  if ('error' in con) return { error: con.error };
  if (con.thu.mau <= 0) return { error: 'Thú của bạn đang bị thương, chữa đã.' };

  await chotDauQuaHan();

  try {
    await db.$transaction(async (tx) => {
      const dang = await tx.pokeDau.findFirst({
        where: { ketThuc: null, OR: [{ chuId: nv.id }, { doiId: nv.id }] },
        select: { id: true },
      });
      if (dang) throw new Error('dang-co-keo');

      const keo = await tx.pokeDau.findUnique({ where: { id } });
      if (!keo || keo.ketThuc || keo.doiId) throw new Error('het-keo');
      if (keo.chuId === nv.id) throw new Error('keo-cua-minh');
      if (nv.cap < keo.capMin) throw new Error('cap-thap');
      if (nv.cap > keo.capMax) throw new Error('cap-cao');

      // Ghi CÓ ĐIỀU KIỆN `doiId: null`: hai người cùng bấm nhận thì chỉ một
      // người vào được, người kia thấy kèo đã có chủ.
      const vao = await tx.pokeDau.updateMany({
        where: { id, doiId: null, ketThuc: null },
        data: {
          doiId: nv.id,
          doiTen: con.thu.ten, doiNguon: con.thu.nguon, doiNac: con.thu.nac, doiHe: con.thu.he,
          doiChieu: [con.thu.c1, con.thu.c2, con.thu.c3, con.thu.c4],
          doiTenChieu: con.thu.chieu,
          doiMau: con.thu.mau, doiMauToiDa: con.thu.mauToiDa, doiThuId: con.thu.id,
          // Chủ kèo đánh trước, đúng như bản gốc.
          luotCua: 'chu',
          hanLuc: new Date(Date.now() + DAU_HAN_MS),
          ke: `${con.thu.ten} bước vào sàn đấu.`,
        },
      });
      if (vao.count === 0) throw new Error('het-keo');
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'dang-co-keo') return { error: 'Bạn đang có một kèo dở rồi.' };
    if (m === 'het-keo') return { error: 'Kèo này có người nhận mất rồi.' };
    if (m === 'keo-cua-minh') return { error: 'Đó là kèo của chính bạn.' };
    if (m === 'cap-thap') return { error: 'Cấp của bạn thấp hơn kèo này nhận.' };
    if (m === 'cap-cao') return { error: 'Cấp của bạn cao hơn kèo này nhận.' };
    return { error: 'Không nhận được kèo lúc này.' };
  }

  revalidatePath('/pokemon/dau-truong');
  return { ok: true, ke: 'Vào sàn rồi — chủ kèo đánh trước.' };
}

/**
 * Một lượt ở đấu trường.
 *
 * Đánh luân phiên: đánh xong là chuyền lượt cho đối thủ và hạn giờ đặt lại.
 * Bản gốc để cả hai bên bấm bất kỳ lúc nào rồi dùng cột `step` để chặn, mà
 * chặn hụt vì đọc rồi ghi; ở đây lượt nằm trong `where` của câu ghi.
 */
export async function danhDau(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const so = Number(fd.get('chieu'));
  if (![1, 2, 3, 4].includes(so)) return { error: 'Chọn một chiêu đã nào.' };

  await chotDauQuaHan();

  try {
    const kq = await db.$transaction(async (tx) => {
      const d = await tx.pokeDau.findFirst({
        where: { ketThuc: null, OR: [{ chuId: nv.id }, { doiId: nv.id }] },
      });
      if (!d) throw new Error('khong-co-tran');
      if (!d.doiId) throw new Error('chua-co-doi');

      const laChu = d.chuId === nv.id;
      const ben = laChu ? 'chu' : 'doi';
      if (d.luotCua !== ben) throw new Error('chua-toi-luot');

      const chieuMinh = (laChu ? d.chuChieu : d.doiChieu)[so - 1] ?? 0;
      const chieuDich = (laChu ? d.doiChieu : d.chuChieu)[so - 1] ?? 0;
      const gay = satThuongDau(chieuMinh, chieuDich);

      const mauDich = Math.max(0, (laChu ? d.doiMau : d.chuMau) ?? 0) - gay;
      const tenMinh = (laChu ? d.chuTen : d.doiTen) ?? 'Thú';
      const tenDich = (laChu ? d.doiTen : d.chuTen) ?? 'Thú';
      const tenChieu = (laChu ? d.chuTenChieu : d.doiTenChieu)[so - 1] ?? `Chiêu ${so}`;
      const ke = `${tenMinh} dùng ${tenChieu}, ${tenDich} mất ${gay} máu.`;

      // ── Hạ gục ────────────────────────────────────────────────────────
      if (mauDich <= 0) {
        const gapDoi = laGioVang();
        const chot = await tx.pokeDau.updateMany({
          where: { id: d.id, ketThuc: null, luotCua: ben },
          data: {
            ...(laChu ? { doiMau: 0 } : { chuMau: 0 }),
            thangId: nv.id, ketThuc: new Date(), luotCua: null,
            ke: `${ke} ${tenDich} gục — bạn thắng!`,
          },
        });
        if (chot.count === 0) throw new Error('chua-toi-luot');

        const thuaId = laChu ? d.doiId : d.chuId;
        const thuaThuId = laChu ? d.doiThuId : d.chuThuId;
        await traThuong(tx, nv.id, thuaId, thuaThuId, gapDoi);

        const expThuong = DAU_EXP * (gapDoi ? 2 : 1);
        const expMoi = nv.exp + expThuong;
        await tx.pokeNhanVat.update({
          where: { id: nv.id }, data: { exp: expMoi, cap: capTheoExp(expMoi) },
        });
        const thuId = laChu ? d.chuThuId : d.doiThuId;
        if (thuId) {
          await tx.pokeThu.updateMany({ where: { id: thuId }, data: { exp: { increment: expThuong } } });
        }
        return {
          ok: true,
          ke: `${ke} ${tenDich} gục — bạn thắng, được ${DAU_VANG * (gapDoi ? 2 : 1)} vàng`
            + ` và ${expThuong} kinh nghiệm.${gapDoi ? ' (giờ vàng, thưởng gấp đôi)' : ''}`,
        };
      }

      // ── Chuyền lượt ───────────────────────────────────────────────────
      const ghi = await tx.pokeDau.updateMany({
        where: { id: d.id, ketThuc: null, luotCua: ben },
        data: {
          ...(laChu ? { doiMau: mauDich } : { chuMau: mauDich }),
          luotCua: laChu ? 'doi' : 'chu',
          hanLuc: new Date(Date.now() + DAU_HAN_MS),
          ke,
        },
      });
      if (ghi.count === 0) throw new Error('chua-toi-luot');
      return { ok: true, ke: `${ke} Giờ tới lượt đối thủ.` };
    });

    revalidatePath('/pokemon/dau-truong');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-co-tran') return { error: 'Bạn không có trận đấu nào.' };
    if (m === 'chua-co-doi') return { error: 'Chưa có ai nhận kèo.' };
    if (m === 'chua-toi-luot') return { error: 'Chưa tới lượt bạn.' };
    return { error: 'Không đánh được lúc này, thử lại nhé.' };
  }
}
