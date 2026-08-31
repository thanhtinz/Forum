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
  BANG_CAP_TOI_THIEU, BANG_GIA_NGOC, BANG_SUC_CHUA, BANG_TEN_TOI_DA, BANG_TEN_TOI_THIEU,
  CAP_CUONG_TOI_DA, CHO_GIA_MAX, CHO_GIA_MIN, MUA_DO_TOI_DA,
  DAU_CAP_MAX, DAU_CAP_MIN, DAU_EXP, DAU_HAN_MS, DAU_VANG, NGOC_MOI_DA, NHIEM_VU,
  O_TRANG_BI, congTrangBi, tenLoaiDo, timHuyenTinh,
  DIEM_DOI_QUA, KHU_CHIEN_TRUONG, QUA_LANH_THO,
  boThu, canVaoKhu, capTheoExp, gymDuocVao, heRaChieu, laGioVang, nacTienHoaMoi, satThuongDau,
  tenHe, timKhu, tinhSatThuong,
  chuoiDiemDanh, dauNgayVN, quaDiemDanh,
} from '@/lib/pokemon-const';
import { chotDauQuaHan, traThuong } from '@/lib/pokemon-dau';
import { tienDoNhiemVu } from '@/lib/pokemon';

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
  const chan = canVaoKhu(khu.bac, khu.ma, r.nv.cap, r.nv.huyChuong);
  if (chan) return { error: `${khu.ten}: ${chan.toLowerCase()}.` };
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

  const moi = await ghiDoGiam(db, nv.id, hoang, false);

  revalidatePath('/pokemon');
  return {
    ok: true,
    ke: `Một con ${hoang.ten} hoang nhảy ra!` + (moi ? ' Loài mới — đã ghi vào Đồ Giám.' : ''),
  };
}

/**
 * Ghi một loài vào Đồ Giám. Trả về `true` nếu đây là lần đầu gặp loài ấy.
 *
 * `upsert` chứ không đọc-rồi-ghi: hai tab cùng gặp một loài thì tab sau rơi
 * vào nhánh `update` chứ không vỡ vì trùng khoá. Và `daBat` chỉ bật lên chứ
 * không bao giờ tắt — gặp lại một loài đã bắt không được xoá dấu đã bắt.
 */
async function ghiDoGiam(
  tx: { pokeDoGiam: { findUnique: typeof db.pokeDoGiam.findUnique; upsert: typeof db.pokeDoGiam.upsert } },
  nhanVatId: string,
  loai: { nguon: number; ten: string; he: number },
  daBat: boolean,
): Promise<boolean> {
  const co = await tx.pokeDoGiam.findUnique({
    where: { nhanVatId_nguon: { nhanVatId, nguon: loai.nguon } },
    select: { id: true },
  });
  await tx.pokeDoGiam.upsert({
    where: { nhanVatId_nguon: { nhanVatId, nguon: loai.nguon } },
    create: { nhanVatId, nguon: loai.nguon, ten: loai.ten, he: loai.he, daBat },
    update: daBat ? { daBat: true } : {},
    select: { id: true },
  });
  return co === null;
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

      // Trang bị đang mặc cộng vào chiêu và bộ thủ. Bản gốc bán đủ ba mươi
      // tám món rồi không trận nào cộng chỉ số của chúng vào đâu cả.
      const dangMac = await tx.pokeDo.findMany({
        where: { nhanVatId: nv.id, dangMac: true },
        select: { cong: true, thu: true, mu: true, giap: true },
        // Bốn ô là bốn ô; `take` để nếu luật một-món-một-ô có ngày hỏng thì
        // cũng không kéo về cả túi.
        take: O_TRANG_BI.length,
      });
      const them = congTrangBi(dangMac);

      const chieu = [toi.c1, toi.c2, toi.c3, toi.c4][so - 1]! + them.cong;
      const tenChieu = toi.chieu[so - 1] ?? `Chiêu ${so}`;
      // Hệ của CHIÊU quyết định phần sát thương gây ra; hệ của CON vẫn quyết
      // định phần phải chịu. Chiêu nào tra không ra hệ thì lấy hệ của con.
      const heRa = heRaChieu(tenChieu, toi.he);
      const { gay, chiu } = tinhSatThuong(
        chieu, boThu(toi) + them.thu, toi.he, tran.cong, tran.thu, tran.he, heRa,
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

      let ke = `${toi.ten} dùng ${tenChieu} (hệ ${tenHe(heRa)}), ${tran.ten} mất ${gay} máu.`;
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

        // Lãnh Thổ là chiến trường: mỗi con hạ được tính một điểm chiến công
        // và một vạch vào bảng diệt quái.
        const laChienTruong = tran.khu === KHU_CHIEN_TRUONG;
        await tx.pokeNhanVat.update({
          where: { id: nv.id },
          data: {
            vang: { increment: tran.vang }, exp: expMoi, cap: capMoi,
            ...(laChienTruong
              ? { diemChien: { increment: 1 }, soDiet: { increment: 1 } }
              : {}),
          },
        });
        return {
          ok: true,
          ke: `${ke} ${tran.ten} gục! Bạn được ${tran.vang} vàng và ${tran.exp} kinh nghiệm.`
            + (laChienTruong ? ' Thêm 1 điểm chiến công.' : '')
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
      await ghiDoGiam(tx, nv.id, tran, true);
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

// ─────────────────────────── Cường hoá ───────────────────────────

/** Mua huyền tinh: cấp 1–3 trả bằng vàng, cấp 4–6 trả bằng ngọc. */
export async function muaHuyenTinh(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const cap = Number(fd.get('cap'));
  const ht = timHuyenTinh(cap);
  if (!ht) return { error: 'Không có loại huyền tinh này.' };
  const sl = Number(fd.get('sl'));
  if (!Number.isInteger(sl) || sl < 1 || sl > MUA_TOI_DA) {
    return { error: `Mỗi lượt mua từ 1 đến ${MUA_TOI_DA} viên.` };
  }

  const canVang = ht.vang * sl;
  const canNgoc = ht.ngoc * sl;

  try {
    await db.$transaction(async (tx) => {
      // Trừ có điều kiện: đủ mới ghi, nên hai tab bấm cùng lúc không tiêu quá
      // số đang có.
      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, vang: { gte: canVang }, ngoc: { gte: canNgoc } },
        data: { vang: { decrement: canVang }, ngoc: { decrement: canNgoc } },
      });
      if (tru.count === 0) throw new Error('khong-du');

      await tx.pokeHuyenTinh.upsert({
        where: { nhanVatId_cap: { nhanVatId: r.nv.id, cap } },
        update: { sl: { increment: sl } },
        create: { nhanVatId: r.nv.id, cap, sl },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'khong-du') {
      return { error: ht.vang ? 'Bạn không đủ vàng.' : 'Bạn không đủ ngọc.' };
    }
    return { error: 'Không mua được lúc này.' };
  }

  revalidatePath('/pokemon/cuong-hoa');
  return {
    ok: true,
    ke: `Đã mua ${sl} huyền tinh cấp ${cap}, hết ${ht.vang ? `${canVang} vàng` : `${canNgoc} ngọc`}.`,
  };
}

/**
 * Cường hoá một con thú.
 *
 * Cấp 1–5 chắc chắn thành công; cấp 6 chỉ 50 % — thất bại thì TỤT một cấp
 * cường hoá. Bản gốc cũng vậy, nhưng ở nhánh thất bại nó vẫn ghi
 * `hpall = $hp` trong khi `$hp` chưa được gán ở nhánh ấy, nên PHP đẩy chuỗi
 * rỗng vào cột số và máu tối đa của con thú về 0 — con thú coi như hỏng vĩnh
 * viễn. Ở đây thất bại chỉ tụt cấp, máu giữ nguyên.
 */
export async function cuongHoa(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const id = String(fd.get('thu') ?? '');

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);

      const thu = await tx.pokeThu.findFirst({ where: { id, nhanVatId: r.nv.id } });
      if (!thu) throw new Error('khong-phai-cua-ban');
      if (thu.capCuong >= CAP_CUONG_TOI_DA) throw new Error('het-cap');

      const capMoi = thu.capCuong + 1;
      const ht = timHuyenTinh(capMoi)!;

      const tru = await tx.pokeHuyenTinh.updateMany({
        where: { nhanVatId: r.nv.id, cap: capMoi, sl: { gte: 1 } },
        data: { sl: { decrement: 1 } },
      });
      if (tru.count === 0) throw new Error('thieu-huyen-tinh');

      if (Math.random() >= ht.coHoi) {
        // Thất bại: tụt một cấp, không xuống dưới 0, máu giữ nguyên.
        const tut = Math.max(0, thu.capCuong - 1);
        await tx.pokeThu.update({ where: { id: thu.id }, data: { capCuong: tut } });
        return {
          ok: true,
          ke: `Huyền tinh cấp ${capMoi} vỡ vụn. ${thu.ten} tụt xuống cường hoá ${tut}.`,
        };
      }

      await tx.pokeThu.update({
        where: { id: thu.id },
        data: {
          capCuong: capMoi,
          mauToiDa: { increment: ht.mau },
          mau: { increment: ht.mau },
        },
      });
      return {
        ok: true,
        ke: `${thu.ten} cường hoá lên cấp ${capMoi}, máu tối đa cộng thêm ${ht.mau}.`,
      };
    });

    revalidatePath('/pokemon/cuong-hoa');
    revalidatePath('/pokemon/kho');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-phai-cua-ban') return { error: 'Đó không phải thú của bạn.' };
    if (m === 'het-cap') return { error: `Con này đã cường hoá tối đa (cấp ${CAP_CUONG_TOI_DA}).` };
    if (m === 'thieu-huyen-tinh') return { error: 'Bạn không có viên huyền tinh cấp kế tiếp.' };
    return { error: 'Không cường hoá được lúc này.' };
  }
}

// ─────────────────────────── Chợ thú ───────────────────────────

/** Rao một con thú lên chợ. Giá tính bằng ngọc, y bản gốc. */
export async function raoBan(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const id = String(fd.get('thu') ?? '');
  const gia = Number(fd.get('gia'));
  if (!Number.isInteger(gia) || gia < CHO_GIA_MIN || gia > CHO_GIA_MAX) {
    return { error: `Giá phải từ ${CHO_GIA_MIN} đến ${CHO_GIA_MAX} ngọc.` };
  }

  const thu = await db.pokeThu.findFirst({ where: { id, nhanVatId: r.nv.id }, select: { id: true, ten: true } });
  if (!thu) return { error: 'Đó không phải thú của bạn.' };
  if (r.nv.raTranId === thu.id) return { error: 'Con này đang ra trận, đổi con khác đã.' };
  if ((await db.pokeThu.count({ where: { nhanVatId: r.nv.id } })) <= 1) {
    return { error: 'Đây là con cuối cùng, bán nốt thì lấy gì mà đánh.' };
  }

  try {
    await db.pokeRao.create({ data: { nhanVatId: r.nv.id, thuId: thu.id, gia }, select: { id: true } });
  } catch {
    return { error: 'Con này đang rao rồi.' };
  }

  revalidatePath('/pokemon/cho');
  return { ok: true, ke: `Đã rao ${thu.ten} với giá ${gia} ngọc.` };
}

/** Rút một con thú khỏi chợ. */
export async function huyRao(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('rao') ?? '');
  // Quyền nằm trong `where`: chỉ người rao mới rút được.
  const xoa = await db.pokeRao.deleteMany({ where: { id, nhanVatId: r.nv.id } });
  if (xoa.count === 0) return { error: 'Không rút được — có thể đã có người mua.' };
  revalidatePath('/pokemon/cho');
  return { ok: true, ke: 'Đã rút khỏi chợ.' };
}

/**
 * Mua một con thú ở chợ.
 *
 * Bản gốc có một lỗ hổng thật: nó cộng ngọc cho người bán bằng cách ĐỌC số
 * ngọc rồi ghi đè cả cột, mà lại đọc trước khi trừ của người mua — mua con
 * của chính mình thì tự nhân đôi ngọc. Ở đây chỉ dùng phép cộng/trừ tương
 * đối, và chặn hẳn việc mua đồ của chính mình.
 */
export async function muaThu(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('rao') ?? '');

  try {
    const kq = await db.$transaction(async (tx) => {
      const rao = await tx.pokeRao.findUnique({ where: { id } });
      if (!rao) throw new Error('het-hang');
      if (rao.nhanVatId === r.nv.id) throw new Error('cua-minh');

      // Xoá bản rao TRƯỚC, có điều kiện: hai người cùng bấm mua thì chỉ một
      // người xoá được, người kia dừng ngay tại đây chứ không lấy mất con thú
      // rồi mới phát hiện.
      const chiem = await tx.pokeRao.deleteMany({ where: { id } });
      if (chiem.count === 0) throw new Error('het-hang');

      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, ngoc: { gte: rao.gia } },
        data: { ngoc: { decrement: rao.gia } },
      });
      if (tru.count === 0) throw new Error('thieu-ngoc');

      await tx.pokeNhanVat.update({
        where: { id: rao.nhanVatId }, data: { ngoc: { increment: rao.gia } },
      });

      // Người bán có thể đang cho chính con này ra trận: gỡ ra trước khi đổi chủ.
      await tx.pokeNhanVat.updateMany({
        where: { id: rao.nhanVatId, raTranId: rao.thuId }, data: { raTranId: null },
      });
      const thu = await tx.pokeThu.update({
        where: { id: rao.thuId }, data: { nhanVatId: r.nv.id },
        select: { ten: true },
      });
      return { ok: true, ke: `Đã mua ${thu.ten} với giá ${rao.gia} ngọc.` };
    });

    revalidatePath('/pokemon/cho');
    revalidatePath('/pokemon/kho');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'het-hang') return { error: 'Con này có người mua mất rồi.' };
    if (m === 'cua-minh') return { error: 'Đó là con bạn đang rao.' };
    if (m === 'thieu-ngoc') return { error: 'Bạn không đủ ngọc.' };
    return { error: 'Không mua được lúc này.' };
  }
}

// ─────────────────────────── Bang hội ───────────────────────────

/** Lập bang. Tốn 500 ngọc, y bản gốc. */
export async function lapBang(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const ten = String(fd.get('ten') ?? '').trim();
  if (ten.length < BANG_TEN_TOI_THIEU || ten.length > BANG_TEN_TOI_DA) {
    return { error: `Tên bang dài ${BANG_TEN_TOI_THIEU}–${BANG_TEN_TOI_DA} ký tự.` };
  }
  if (r.nv.bangId) return { error: 'Bạn đang ở trong một bang rồi.' };

  try {
    await db.$transaction(async (tx) => {
      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, bangId: null, ngoc: { gte: BANG_GIA_NGOC } },
        data: { ngoc: { decrement: BANG_GIA_NGOC } },
      });
      if (tru.count === 0) throw new Error('khong-du');

      const bang = await tx.pokeBang.create({
        data: { ten, truongId: r.nv.id, sucChua: BANG_SUC_CHUA },
        select: { id: true },
      });
      await tx.pokeNhanVat.update({ where: { id: r.nv.id }, data: { bangId: bang.id } });
    });
  } catch (e) {
    const s = String(e);
    if (e instanceof Error && e.message === 'khong-du') {
      return { error: `Lập bang tốn ${BANG_GIA_NGOC} ngọc, hoặc bạn đã ở trong bang.` };
    }
    if (s.includes('Unique')) return { error: 'Tên bang này có người dùng rồi.' };
    return { error: 'Không lập được bang lúc này.' };
  }

  revalidatePath('/pokemon/bang');
  return { ok: true, ke: `Đã lập bang ${ten}.` };
}

/** Gia nhập một bang. Cần cấp 15 trở lên, y bản gốc. */
export async function vaoBang(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('bang') ?? '');

  if (r.nv.bangId) return { error: 'Bạn đang ở trong một bang rồi.' };
  if (r.nv.cap < BANG_CAP_TOI_THIEU) {
    return { error: `Phải đạt cấp ${BANG_CAP_TOI_THIEU} mới vào bang được.` };
  }

  try {
    await db.$transaction(async (tx) => {
      const bang = await tx.pokeBang.findUnique({ where: { id }, select: { sucChua: true } });
      if (!bang) throw new Error('khong-co-bang');

      // Đếm chỗ trống TRONG giao dịch rồi mới ghi: đọc ngoài rồi ghi trong là
      // hai người cùng vào một chỗ cuối.
      const dangCo = await tx.pokeNhanVat.count({ where: { bangId: id } });
      if (dangCo >= bang.sucChua) throw new Error('het-cho');

      const vao = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, bangId: null, cap: { gte: BANG_CAP_TOI_THIEU } },
        data: { bangId: id },
      });
      if (vao.count === 0) throw new Error('khong-vao-duoc');
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-co-bang') return { error: 'Bang này không còn.' };
    if (m === 'het-cho') return { error: 'Bang đã đủ người.' };
    return { error: 'Không vào bang được lúc này.' };
  }

  revalidatePath('/pokemon/bang');
  return { ok: true, ke: 'Đã gia nhập bang.' };
}

/** Rời bang. Trưởng bang rời thì bang giải tán. */
export async function roiBang(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  if (!r.nv.bangId) return { error: 'Bạn không ở bang nào.' };

  const bang = await db.pokeBang.findUnique({
    where: { id: r.nv.bangId }, select: { id: true, truongId: true, ten: true },
  });
  if (!bang) return { error: 'Bang này không còn.' };

  if (bang.truongId === r.nv.id) {
    // Trưởng bang đi thì bang tan: `bangId` của mọi người tự về rỗng nhờ
    // `onDelete: SetNull`, không cần quét tay.
    await db.pokeBang.delete({ where: { id: bang.id } });
    revalidatePath('/pokemon/bang');
    return { ok: true, ke: `Bang ${bang.ten} đã giải tán.` };
  }

  await db.pokeNhanVat.update({ where: { id: r.nv.id }, data: { bangId: null } });
  revalidatePath('/pokemon/bang');
  return { ok: true, ke: 'Đã rời bang.' };
}

/** Góp vàng vào quỹ bang, hoặc rút ra. */
export async function quyBang(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  if (!r.nv.bangId) return { error: 'Bạn không ở bang nào.' };

  const huong = String(fd.get('huong') ?? '');
  if (huong !== 'gop' && huong !== 'rut') return { error: 'Chọn góp hay rút đã nào.' };
  const so = Number(fd.get('so'));
  if (!Number.isInteger(so) || so < 1) return { error: 'Số vàng phải là số nguyên dương.' };

  const bang = await db.pokeBang.findUnique({
    where: { id: r.nv.bangId }, select: { id: true, truongId: true, khoaQuy: true },
  });
  if (!bang) return { error: 'Bang này không còn.' };
  if (huong === 'rut' && bang.khoaQuy && bang.truongId !== r.nv.id) {
    return { error: 'Trưởng bang đang khoá quỹ.' };
  }

  try {
    await db.$transaction(async (tx) => {
      if (huong === 'gop') {
        const tru = await tx.pokeNhanVat.updateMany({
          where: { id: r.nv.id, vang: { gte: so } }, data: { vang: { decrement: so } },
        });
        if (tru.count === 0) throw new Error('khong-du');
        await tx.pokeBang.update({ where: { id: bang.id }, data: { vang: { increment: so } } });
        return;
      }
      const tru = await tx.pokeBang.updateMany({
        where: { id: bang.id, vang: { gte: so } }, data: { vang: { decrement: so } },
      });
      if (tru.count === 0) throw new Error('quy-thieu');
      await tx.pokeNhanVat.update({ where: { id: r.nv.id }, data: { vang: { increment: so } } });
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-du') return { error: 'Bạn không đủ vàng.' };
    if (m === 'quy-thieu') return { error: 'Quỹ bang không đủ.' };
    return { error: 'Không làm được lúc này.' };
  }

  revalidatePath('/pokemon/bang');
  return { ok: true, ke: huong === 'gop' ? `Đã góp ${so} vàng vào quỹ.` : `Đã rút ${so} vàng.` };
}

/** Trưởng bang khoá hoặc mở quỹ. */
export async function khoaQuyBang(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  if (!r.nv.bangId) return { error: 'Bạn không ở bang nào.' };

  // Quyền nằm trong `where`: chỉ trưởng bang đổi được.
  const bang = await db.pokeBang.findFirst({
    where: { id: r.nv.bangId, truongId: r.nv.id }, select: { id: true, khoaQuy: true },
  });
  if (!bang) return { error: 'Chỉ trưởng bang mới đổi được.' };

  await db.pokeBang.update({ where: { id: bang.id }, data: { khoaQuy: !bang.khoaQuy } });
  revalidatePath('/pokemon/bang');
  return { ok: true, ke: bang.khoaQuy ? 'Đã mở quỹ cho cả bang.' : 'Đã khoá quỹ.' };
}

// ─────────────────────────── Nhiệm vụ ───────────────────────────

/**
 * Nhận thưởng nhiệm vụ kế tiếp.
 *
 * Nhận theo THỨ TỰ và mỗi bước đúng một lần: cột `nhiemVu` đếm số bước đã
 * nhận, và câu ghi mang chính con số cũ trong `where` nên bấm hai tab không
 * nhận được hai lần.
 */
export async function nhanThuongNhiemVu(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const { nv } = r;

  const buoc = nv.nhiemVu;
  const nhiem = NHIEM_VU[buoc];
  if (!nhiem) return { error: 'Bạn đã làm hết chuỗi nhiệm vụ.' };

  const tienDo = await tienDoNhiemVu(nv.id);
  if (!tienDo[buoc]) return { error: `Chưa xong: ${nhiem.mo}` };

  // CỘNG THÊM chứ không ghi con số tuyệt đối tính từ `nv.exp` vừa đọc: nhận
  // thưởng đúng lúc tab kia vừa thắng một trận thì phần kinh nghiệm của trận ấy
  // bị đè mất. Cấp phải tính lại từ kinh nghiệm SAU khi cộng, nên chốt trong
  // cùng một giao dịch: đọc ra rồi mới ghi cấp.
  const ghi = await db.$transaction(async (tx) => {
    const buocDung = await tx.pokeNhanVat.updateMany({
      where: { id: nv.id, nhiemVu: buoc },
      data: {
        nhiemVu: buoc + 1,
        exp: { increment: nhiem.exp },
        vang: { increment: nhiem.vang },
        ngoc: { increment: nhiem.ngoc },
      },
    });
    if (buocDung.count === 0) return 0;

    const sau = await tx.pokeNhanVat.findUnique({ where: { id: nv.id }, select: { exp: true } });
    if (sau) {
      await tx.pokeNhanVat.update({
        where: { id: nv.id }, data: { cap: capTheoExp(sau.exp) }, select: { id: true },
      });
    }
    return buocDung.count;
  });
  if (ghi === 0) return { error: 'Phần thưởng này đã nhận rồi.' };

  revalidatePath('/pokemon/nhiem-vu');
  const qua = [
    `${nhiem.exp} kinh nghiệm`,
    ...(nhiem.vang ? [`${nhiem.vang} vàng`] : []),
    ...(nhiem.ngoc ? [`${nhiem.ngoc} ngọc`] : []),
  ].join(', ');
  return { ok: true, ke: `Xong “${nhiem.ten}” — nhận ${qua}.` };
}

// ─────────────────────────── Lãnh Thổ: đổi quà ───────────────────────────

/**
 * Đổi 100 điểm chiến công lấy một phần quà bốc ngẫu nhiên trong bảy phần.
 *
 * Trừ điểm CÓ ĐIỀU KIỆN rồi mới bốc, nên hai tab bấm cùng lúc không lấy được
 * hai phần quà bằng một lần điểm.
 */
export async function doiQuaChien(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  try {
    const kq = await db.$transaction(async (tx) => {
      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, diemChien: { gte: DIEM_DOI_QUA } },
        data: { diemChien: { decrement: DIEM_DOI_QUA } },
      });
      if (tru.count === 0) throw new Error('thieu-diem');

      const qua = QUA_LANH_THO[Math.floor(Math.random() * QUA_LANH_THO.length)]!;
      await tx.pokeNhanVat.update({
        where: { id: r.nv.id },
        data: {
          ...(qua.da ? { da: { increment: qua.da } } : {}),
          ...(qua.cau ? { cau: { increment: qua.cau } } : {}),
          ...(qua.vang ? { vang: { increment: qua.vang } } : {}),
          ...(qua.ngoc ? { ngoc: { increment: qua.ngoc } } : {}),
          ...(qua.skToiDa ? { skToiDa: { increment: qua.skToiDa } } : {}),
        },
      });
      return { ok: true, ke: `Bốc trúng: ${qua.ten}.` };
    });
    revalidatePath('/pokemon/lanh-tho');
    return kq;
  } catch (e) {
    if (e instanceof Error && e.message === 'thieu-diem') {
      return { error: `Cần ${DIEM_DOI_QUA} điểm chiến công mới đổi được.` };
    }
    return { error: 'Không đổi được lúc này.' };
  }
}

// ─────────────────────────── Trang bị và thuốc ───────────────────────────

/** Mua một món ở quầy trang bị. Thuốc thì mua được nhiều, trang bị mỗi lần một. */
export async function muaDo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const ma = Number(fd.get('ma'));
  const hang = await db.pokeHang.findUnique({ where: { ma } });
  if (!hang) return { error: 'Không có món này.' };

  const laThuoc = hang.loai === 'elixir';
  const sl = laThuoc ? Number(fd.get('sl') ?? 1) : 1;
  if (!Number.isInteger(sl) || sl < 1 || sl > MUA_DO_TOI_DA) {
    return { error: `Mỗi lượt mua từ 1 đến ${MUA_DO_TOI_DA} món.` };
  }
  if (r.nv.cap < hang.cap) return { error: `Món này cần cấp ${hang.cap}.` };

  const canVang = hang.vang * sl;
  const canNgoc = hang.ngoc * sl;

  try {
    await db.$transaction(async (tx) => {
      // Bản gốc trừ CẢ vàng lẫn ngọc với những món ghi hai giá — giữ nguyên,
      // và trừ có điều kiện nên không tiêu quá số đang có.
      const tru = await tx.pokeNhanVat.updateMany({
        where: { id: r.nv.id, vang: { gte: canVang }, ngoc: { gte: canNgoc }, cap: { gte: hang.cap } },
        data: { vang: { decrement: canVang }, ngoc: { decrement: canNgoc } },
      });
      if (tru.count === 0) throw new Error('khong-du');

      const phan = {
        ma: hang.ma, ten: hang.ten, loai: hang.loai,
        cong: hang.cong, thu: hang.thu, mu: hang.mu, giap: hang.giap, mau: hang.mau,
      };
      if (laThuoc) {
        // Thuốc gộp thành một dòng cho khỏi đầy túi.
        const co = await tx.pokeDo.findFirst({
          where: { nhanVatId: r.nv.id, ma: hang.ma }, select: { id: true },
        });
        if (co) await tx.pokeDo.update({ where: { id: co.id }, data: { sl: { increment: sl } } });
        else await tx.pokeDo.create({ data: { nhanVatId: r.nv.id, ...phan, sl }, select: { id: true } });
      } else {
        await tx.pokeDo.create({ data: { nhanVatId: r.nv.id, ...phan }, select: { id: true } });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'khong-du') {
      return { error: 'Bạn không đủ tiền, hoặc chưa đủ cấp.' };
    }
    return { error: 'Không mua được lúc này.' };
  }

  revalidatePath('/pokemon/trang-bi');
  const gia = [canVang ? `${canVang} vàng` : '', canNgoc ? `${canNgoc} ngọc` : ''].filter(Boolean).join(' và ');
  return { ok: true, ke: `Đã mua ${sl > 1 ? `${sl} ` : ''}${tenLoaiDo(hang.loai)} ${hang.ten}, hết ${gia}.` };
}

/** Mặc một món vào ô của nó; món cũ ở ô ấy tự cởi ra. */
export async function macDo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('do') ?? '');

  try {
    const kq = await db.$transaction(async (tx) => {
      const mon = await tx.pokeDo.findFirst({ where: { id, nhanVatId: r.nv.id } });
      if (!mon) throw new Error('khong-phai-cua-ban');
      if (mon.loai === 'elixir') throw new Error('la-thuoc');

      // Cởi món cũ cùng ô TRƯỚC rồi mới mặc món mới: mỗi ô đúng một món, và
      // luật ấy nằm trong hai câu ghi chứ không phải trong lời hứa.
      await tx.pokeDo.updateMany({
        where: { nhanVatId: r.nv.id, loai: mon.loai, dangMac: true },
        data: { dangMac: false },
      });
      await tx.pokeDo.update({ where: { id: mon.id }, data: { dangMac: true } });
      return { ok: true, ke: `Đã mặc ${tenLoaiDo(mon.loai).toLowerCase()} ${mon.ten}.` };
    });
    revalidatePath('/pokemon/trang-bi');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-phai-cua-ban') return { error: 'Đó không phải đồ của bạn.' };
    if (m === 'la-thuoc') return { error: 'Thuốc thì uống chứ không mặc.' };
    return { error: 'Không mặc được lúc này.' };
  }
}

/** Cởi một món đang mặc ra. */
export async function coiDo(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('do') ?? '');
  // Quyền nằm trong `where`.
  const xong = await db.pokeDo.updateMany({
    where: { id, nhanVatId: r.nv.id, dangMac: true }, data: { dangMac: false },
  });
  if (xong.count === 0) return { error: 'Món này không phải của bạn, hoặc không đang mặc.' };
  revalidatePath('/pokemon/trang-bi');
  return { ok: true, ke: 'Đã cởi ra.' };
}

/**
 * Uống một liều thuốc, hồi máu cho con đang ra trận.
 *
 * Dùng được cả khi đang đánh dở — đó là lý do thuốc tồn tại; trạm y tế bắt
 * chờ năm phút một lần thì giữa trận chẳng cứu được gì.
 */
export async function uongThuoc(_prev: PokeState, fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };
  const id = String(fd.get('do') ?? '');

  try {
    const kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, r.userId);

      const mon = await tx.pokeDo.findFirst({ where: { id, nhanVatId: r.nv.id, loai: 'elixir' } });
      if (!mon) throw new Error('khong-co-thuoc');

      const thu = r.nv.raTranId
        ? await tx.pokeThu.findFirst({ where: { id: r.nv.raTranId, nhanVatId: r.nv.id } })
        : await tx.pokeThu.findFirst({ where: { nhanVatId: r.nv.id }, orderBy: { createdAt: 'asc' } });
      if (!thu) throw new Error('khong-co-thu');
      if (thu.mau >= thu.mauToiDa) throw new Error('day-mau');

      const tru = await tx.pokeDo.updateMany({
        where: { id: mon.id, sl: { gte: 1 } }, data: { sl: { decrement: 1 } },
      });
      if (tru.count === 0) throw new Error('khong-co-thuoc');
      await tx.pokeDo.deleteMany({ where: { id: mon.id, sl: { lte: 0 } } });

      const moi = Math.min(thu.mauToiDa, thu.mau + mon.mau);
      let ke = `${thu.ten} hồi ${moi - thu.mau} máu, còn ${moi}/${thu.mauToiDa}.`;

      // Uống thuốc GIỮA TRẬN mất một lượt: thú hoang được đánh trả.
      // Không tính lượt thì cứ đứng đó uống là bất tử, và cả bảng chỉ số thủ
      // lẫn bảng khắc hệ thành vô nghĩa. Ngoài trận thì uống không mất gì.
      const tran = await tx.pokeTran.findUnique({ where: { nhanVatId: r.nv.id } });
      let mauSau = moi;
      if (tran) {
        const dangMac = await tx.pokeDo.findMany({
          where: { nhanVatId: r.nv.id, dangMac: true },
          select: { cong: true, thu: true, mu: true, giap: true },
          take: O_TRANG_BI.length,
        });
        const { chiu } = tinhSatThuong(
          0, boThu(thu) + congTrangBi(dangMac).thu, thu.he, tran.cong, tran.thu, tran.he,
        );
        mauSau = Math.max(0, moi - chiu);
        ke += ` ${tran.ten} đánh trả, mất ${chiu} máu, còn ${mauSau}/${thu.mauToiDa}.`;
        if (mauSau <= 0) {
          await tx.pokeTran.delete({ where: { id: tran.id } });
          ke += ` ${thu.ten} gục mất rồi.`;
        } else {
          await tx.pokeTran.update({ where: { id: tran.id }, data: { ke } });
        }
      }

      await tx.pokeThu.update({ where: { id: thu.id }, data: { mau: mauSau } });
      return { ok: true, ke };
    });
    revalidatePath('/pokemon');
    revalidatePath('/pokemon/trang-bi');
    return kq;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'khong-co-thuoc') return { error: 'Bạn không có liều thuốc nào.' };
    if (m === 'khong-co-thu') return { error: 'Bạn chưa có con thú nào ra trận.' };
    if (m === 'day-mau') return { error: 'Thú của bạn đang đầy máu.' };
    return { error: 'Không uống được lúc này.' };
  }
}

/**
 * Điểm danh hằng ngày.
 *
 * Chuỗi ngày liên tiếp cho quà to dần tới ngày thứ bảy rồi giữ nguyên. Điều
 * kiện "hôm nay chưa nhận" nằm TRONG `where` của `updateMany` chứ không đọc
 * rồi mới ghi: hai tab bấm cùng lúc thì tab sau đếm được 0 dòng và không phát
 * quà lần thứ hai.
 */
export async function diemDanh(_prev: PokeState, _fd: FormData): Promise<PokeState> {
  const r = await layNhanVat();
  if ('error' in r) return { error: r.error };

  const homNay = dauNgayVN(new Date());
  const chuoi = chuoiDiemDanh(r.nv.diemDanhNgay, r.nv.diemDanhChuoi, homNay);
  if (chuoi === null) return { error: 'Hôm nay bạn điểm danh rồi, mai quay lại nhé.' };

  const qua = quaDiemDanh(chuoi);
  const ghi = await db.pokeNhanVat.updateMany({
    where: {
      id: r.nv.id,
      OR: [{ diemDanhNgay: null }, { diemDanhNgay: { lt: homNay } }],
    },
    data: {
      diemDanhNgay: homNay,
      diemDanhChuoi: chuoi,
      vang: { increment: qua.vang },
      cau: { increment: qua.cau },
      ngoc: { increment: qua.ngoc },
    },
  });
  if (ghi.count === 0) return { error: 'Hôm nay bạn điểm danh rồi, mai quay lại nhé.' };

  revalidatePath('/pokemon');
  return {
    ok: true,
    ke: `Điểm danh ngày thứ ${chuoi}: nhận ${qua.vang.toLocaleString('vi')} vàng`
      + `, ${qua.cau} quả cầu`
      + (qua.ngoc ? ` và ${qua.ngoc} ngọc` : '') + '.',
  };
}
