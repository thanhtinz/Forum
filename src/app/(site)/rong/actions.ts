'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { bocRongNgauNhien, danhNhau, demSuuTam, type KeLaiTran } from '@/lib/rong';
import {
  AP_MS, CHUONG_TOI_DA, DAU_MOI_NGAY, EXP_MOI_BUA,
  EXP_MOI_LAN_CHOI, GIA_AN, GIA_NO_NGAY, GIA_TRUNG, NGUONG_CHO_AN, NO_MOI_BUA,
  PHI_DAU, THE_LUC_CHOI, THUONG_THANG, TOI_DA_CHAM, noHienGio, theLucHienGio,
  VUI_MOI_LAN, CAP_TOI_DA, GIA_LAI, LAI_CAP_TOI_THIEU, LAI_CHO_MS, LAI_TOI_DA,
  MOC_SUU_TAM, MUA_TOI_DA, bocTrungLai, chiSo, dauNgayVN, diemSauTran, expCanDe,
  loiTenRong, mocDatDuoc, muaCua, tenRong, timDo, vuiHienGio,
} from '@/lib/rong-const';

/**
 * Đảo rồng — mười hai thao tác đổi dữ liệu.
 *
 * Mọi hàm export ở đây là một endpoint POST công khai, nên hàm nào cũng tự kiểm
 * quyền của chính nó và tự kiểm con rồng có đúng của người gọi không. Không hàm
 * nào được tin rằng trang gọi nó đã kiểm hộ.
 *
 * Chống hai tab bấm cùng lúc theo đúng hai kiểu đã dùng ở nông trại:
 *
 *  • GHI CÓ ĐIỀU KIỆN — cho ăn, chơi, nở trứng: câu `updateMany` mang theo cả
 *    trạng thái cũ trong `where`, nên luồng thứ hai thấy `count === 0` và không
 *    cộng gì thêm.
 *  • KHOÁ HÀNG NGƯỜI DÙNG — mua trứng và đấu trường: luật nằm ở phép ĐẾM
 *    (chuồng tối đa mấy con, mỗi ngày mấy trận), thứ một câu `where` không nói
 *    được.
 */

export interface RongState {
  ok?: boolean;
  error?: string;
  /** Câu kể lại việc vừa làm, in ngay trên trang. */
  ke?: string;
  /**
   * Trận vừa đánh, đủ để dựng lại trên màn hình.
   *
   * `RongTran.dienBien` ghi đủ từng hiệp từ ngày đầu mà chẳng nơi nào đọc —
   * đánh xong chỉ hiện một dòng chữ. Trả về đây thì màn kể lại trận dựng được
   * ngay, không phải hỏi lại máy chủ một lượt nữa.
   */
  tran?: KeLaiTran;
}

async function nguoiNuoi(): Promise<{ userId: string } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để vào đảo rồng.' };
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chơi đảo rồng') };
  return { userId };
}

function lamMoi(): void {
  revalidatePath('/rong', 'layout');
}

function docId(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s.length > 0 && s.length < 40 ? s : null;
}

// ─────────────────────────── Mua trứng ───────────────────────────

export async function muaTrung(_prev: RongState, _formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  try {
    await db.$transaction(async (tx) => {
      // Khoá hàng người dùng: luật là "đang nuôi ít hơn N con", phải đếm xong
      // mới tạo, nên hai tab cùng bấm phải xếp hàng ở đây.
      await lockUsers(tx, me.userId);

      const dang = await tx.rong.count({ where: { userId: me.userId } });
      if (dang >= CHUONG_TOI_DA) {
        throw new Error(`Chuồng chỉ chứa được ${CHUONG_TOI_DA} con. Thả bớt rồi hẵng mua trứng mới.`);
      }

      await grantPoints({
        userId: me.userId, amount: -GIA_TRUNG, reason: 'RONG_TRUNG',
        note: 'Mua một quả trứng rồng',
      }, tx);

      await tx.rong.create({
        data: {
          userId: me.userId,
          ...bocRongNgauNhien(),
          apXongAt: new Date(Date.now() + AP_MS),
        },
        select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. Một quả trứng giá ${GIA_TRUNG} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không mua được trứng.' };
  }

  lamMoi();
  return { ok: true, ke: 'Đã mua một quả trứng. Ủ ấm rồi chờ nó nở nhé.' };
}

// ─────────────────────────── Nở trứng ───────────────────────────

/**
 * Cho trứng nở.
 *
 * `apXongAt` đọc từ hàng đã lưu chứ không tính lại từ đồng hồ — đây đúng chỗ đã
 * làm hỏng bàn bầu cua một lần: hai nguồn sự thật thì có lúc lệch nhau.
 *
 * Trả thêm điểm thì nở ngay. Việc trừ điểm và việc nở nằm trong cùng một
 * transaction, nên trứng đã nở ở tab khác là `updateMany` không khớp, và
 * `throw` kéo luôn khoản tiền vừa trừ về chỗ cũ.
 */
export async function noTrung(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu quả trứng cần nở.' };
  const traTien = String(formData.get('ngay') ?? '') === '1';

  let ten = '';
  try {
    await db.$transaction(async (tx) => {
      // Lấy về CHỈ để biết loài/màu mà kể tên; điều kiện thật nằm ở `where`
      // của `updateMany` bên dưới.
      const r = await tx.rong.findFirst({
        where: { id, userId: me.userId, noAt: null },
        select: { loai: true, mau: true, apXongAt: true },
      });
      if (!r) throw new Error('Không tìm thấy quả trứng nào của bạn.');

      const toiGio = Date.now() >= r.apXongAt.getTime();
      if (!toiGio && !traTien) throw new Error('Trứng chưa tới giờ nở.');

      if (!toiGio) {
        await grantPoints({
          userId: me.userId, amount: -GIA_NO_NGAY, reason: 'RONG_TRUNG', refId: id,
          note: 'Thúc trứng nở ngay',
        }, tx);
      }

      const now = new Date();
      const xong = await tx.rong.updateMany({
        where: { id, userId: me.userId, noAt: null },
        data: {
          noAt: now, vui: 60, vuiTinhAt: now,
          doNo: 70, noTinhAt: now, theLuc: TOI_DA_CHAM, lucTinhAt: now,
        },
      });
      if (xong.count === 0) throw new Error('Quả trứng này vừa nở ở nơi khác rồi.');

      // Đếm lại sổ sưu tầm NGAY trong giao dịch này. Đếm lúc đọc trang thì
      // bảng xếp hạng sắp theo một con số đi sau sự thật, mà `ORDER BY` thì
      // không nhận một phép đếm `distinct`.
      const daCo = await demSuuTam(tx, me.userId);
      await tx.rongNguoiChoi.upsert({
        where: { userId: me.userId },
        create: { userId: me.userId, daSuuTam: daCo },
        update: { daSuuTam: daCo },
        select: { id: true },
      });

      ten = tenRong(r.loai, r.mau);
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. Thúc nở ngay tốn ${GIA_NO_NGAY} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không nở được trứng.' };
  }

  lamMoi();
  return { ok: true, ke: `Trứng nở rồi — một chú ${ten}!` };
}

// ─────────────────────────── Cho ăn ───────────────────────────

/** Cộng kinh nghiệm rồi lên cấp nếu đủ; trả về cấp mới. */
function lenCap(cap: number, exp: number): { cap: number; exp: number; len: boolean } {
  let c = cap;
  let e = exp;
  let len = false;
  while (c < CAP_TOI_DA && e >= expCanDe(c)) {
    e -= expCanDe(c);
    c += 1;
    len = true;
  }
  return { cap: c, exp: c >= CAP_TOI_DA ? 0 : e, len };
}

export async function choAn(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu con rồng cần cho ăn.' };

  let ke = '';
  try {
    await db.$transaction(async (tx) => {
      const r = await tx.rong.findFirst({
        where: { id, userId: me.userId, noAt: { not: null } },
        select: {
          cap: true, exp: true, vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
          ten: true, loai: true, mau: true,
        },
      });
      if (!r) throw new Error('Không tìm thấy con rồng nào của bạn.');

      const now = Date.now();
      /*
       * Chặn bằng CHÍNH ĐỘ NO, không bằng hẹn giờ.
       *
       * Trước đây là "cho ăn xong chờ nửa tiếng" — một con số vô hình chẳng
       * nói lên điều gì về con rồng, người chơi chỉ thấy nút mờ đi. Nay nó
       * no thì nó không ăn nữa, mà độ no thì đang hiện ngay trên thẻ.
       */
      const noGio = noHienGio(r.doNo, r.noTinhAt.getTime(), now);
      if (noGio >= NGUONG_CHO_AN) throw new Error('Nó còn no căng, chưa ăn thêm được đâu.');

      await grantPoints({
        userId: me.userId, amount: -GIA_AN, reason: 'RONG_AN', refId: id,
        note: 'Mua thức ăn cho rồng',
      }, tx);

      const sau = lenCap(r.cap, r.exp + EXP_MOI_BUA);
      const vuiMoi = Math.min(TOI_DA_CHAM, vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now) + 8);
      const noMoi = Math.min(TOI_DA_CHAM, noGio + NO_MOI_BUA);

      // `noTinhAt` nằm trong `where`: hai tab cùng bấm thì tab sau không khớp
      // và `throw` kéo luôn khoản tiền vừa trừ về chỗ cũ.
      const xong = await tx.rong.updateMany({
        where: { id, userId: me.userId, noTinhAt: r.noTinhAt },
        data: {
          cap: sau.cap, exp: sau.exp,
          vui: vuiMoi, vuiTinhAt: new Date(now),
          doNo: noMoi, noTinhAt: new Date(now),
          anLanCuoi: new Date(now),
        },
      });
      if (xong.count === 0) throw new Error('Bạn vừa cho nó ăn ở nơi khác rồi.');

      const ten = r.ten || tenRong(r.loai, r.mau);
      ke = sau.len ? `${ten} ăn no và lên cấp ${sau.cap}!` : `${ten} ăn no nê, +${EXP_MOI_BUA} kinh nghiệm.`;
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. Một bữa ăn tốn ${GIA_AN} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không cho ăn được.' };
  }

  lamMoi();
  return { ok: true, ke };
}

// ─────────────────────────── Chơi bóng ───────────────────────────

export async function choiBong(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu con rồng muốn chơi cùng.' };

  const r = await db.rong.findFirst({
    where: { id, userId: me.userId, noAt: { not: null } },
    select: {
      cap: true, exp: true, vui: true, vuiTinhAt: true,
      theLuc: true, lucTinhAt: true, ten: true, loai: true, mau: true,
    },
  });
  if (!r) return { error: 'Không tìm thấy con rồng nào của bạn.' };

  const now = Date.now();
  // Chặn bằng THỂ LỰC, không bằng hẹn giờ — xem chú thích ở `choAn`.
  const lucGio = theLucHienGio(r.theLuc, r.lucTinhAt.getTime(), now);
  if (lucGio < THE_LUC_CHOI) return { error: 'Nó đang mệt lử, để nó nghỉ lấy sức đã.' };

  const sau = lenCap(r.cap, r.exp + EXP_MOI_LAN_CHOI);
  const vuiMoi = Math.min(TOI_DA_CHAM, vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now) + VUI_MOI_LAN);

  const xong = await db.rong.updateMany({
    where: { id, userId: me.userId, lucTinhAt: r.lucTinhAt },
    data: {
      cap: sau.cap, exp: sau.exp,
      vui: vuiMoi, vuiTinhAt: new Date(now),
      theLuc: lucGio - THE_LUC_CHOI, lucTinhAt: new Date(now),
      choiLanCuoi: new Date(now),
    },
  });
  if (xong.count === 0) return { error: 'Bạn vừa chơi với nó ở nơi khác rồi.' };

  lamMoi();
  const ten = r.ten || tenRong(r.loai, r.mau);
  return {
    ok: true,
    ke: sau.len
      ? `${ten} chơi bóng vui quá và lên cấp ${sau.cap}!`
      : `${ten} đuổi bóng chán chê, vui hẳn lên.`,
  };
}

// ─────────────────────────── Đặt tên ───────────────────────────

export async function datTen(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu con rồng cần đặt tên.' };

  const ten = String(formData.get('ten') ?? '').trim();
  const loi = loiTenRong(ten);
  if (loi) return { error: loi };

  const xong = await db.rong.updateMany({
    where: { id, userId: me.userId, noAt: { not: null } },
    data: { ten },
  });
  if (xong.count === 0) return { error: 'Không tìm thấy con rồng nào của bạn.' };

  lamMoi();
  return { ok: true, ke: `Từ nay nó tên là ${ten}.` };
}

// ─────────────────────────── Cử ra trận ───────────────────────────

export async function cuRaTran(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu con rồng muốn cử ra trận.' };

  const co = await db.rong.count({ where: { id, userId: me.userId, noAt: { not: null } } });
  if (co === 0) return { error: 'Không tìm thấy con rồng nào của bạn.' };

  // Mỗi người chỉ một con ra trận: hạ hết xuống rồi mới nâng con được chọn.
  await db.$transaction([
    db.rong.updateMany({ where: { userId: me.userId }, data: { raTran: false } }),
    db.rong.updateMany({ where: { id, userId: me.userId }, data: { raTran: true } }),
  ]);

  lamMoi();
  return { ok: true, ke: 'Đã cử ra trận. Người khác sẽ thấy nó ở đấu trường.' };
}

// ─────────────────────────── Đấu trường ───────────────────────────

/**
 * Thách đấu một con rồng của người khác.
 *
 * Người bị thách KHÔNG mất điểm dù thắng hay thua: con rồng của họ chỉ đứng đó
 * làm đối thủ, họ không hề bấm nút nào. Trừ điểm người vắng mặt là lấy tiền của
 * người không được hỏi ý.
 */
export async function thachDau(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const cuaToi = docId(formData.get('cua_toi'));
  const doiThu = docId(formData.get('doi_thu'));
  if (!cuaToi || !doiThu) return { error: 'Thiếu rồng để ghép trận.' };
  if (cuaToi === doiThu) return { error: 'Không thể tự đánh chính mình.' };

  let ke = '';
  let keLai: KeLaiTran | undefined;
  try {
    await db.$transaction(async (tx) => {
      // Khoá: trần "mỗi ngày mấy trận" là phép đếm, `where` không nói được.
      await lockUsers(tx, me.userId);

      const now = Date.now();
      /*
       * Đếm trên `RongLuotDau` chứ KHÔNG trên `RongTran`.
       *
       * `RongTran` cascade theo cả hai con rồng, mà `thaRong` cho thả bất cứ
       * lúc nào — nên đếm ở đó thì người chơi tự xoá được bộ đếm của chính
       * mình: đấu đủ 10 trận, thả con rồng vừa đấu, bộ đếm về 0, đấu tiếp.
       * Thắng ăn 25 điểm ròng mỗi trận nên vòng lặp ấy có lãi.
       *
       * Tệ hơn nữa là đường vòng qua người khác: B cử rồng ra trận cho A đánh
       * đủ 10 trận rồi B thả con rồng ấy — cascade quét luôn 10 hàng có `bId`
       * là nó, và bộ đếm của A về 0 dù A không đụng gì vào rồng của mình.
       *
       * `RongLuotDau` không có đường nào để người chơi xoá. Trước đây việc này
       * nhờ bảng chung `MiniGamePlay` của khu giải trí; khu ấy dẹp mấy trò cầu
       * may nên đảo phải có sổ của riêng mình.
       */
      const daDau = await tx.rongLuotDau.count({
        where: { userId: me.userId, createdAt: { gte: dauNgayVN(now) } },
      });
      if (daDau >= DAU_MOI_NGAY) {
        throw new Error(`Hôm nay bạn đã đấu đủ ${DAU_MOI_NGAY} trận. Mai quay lại nhé.`);
      }

      const a = await tx.rong.findFirst({
        where: { id: cuaToi, userId: me.userId, noAt: { not: null } },
        select: { id: true, loai: true, cap: true, vui: true, vuiTinhAt: true, ten: true, mau: true, doi: true },
      });
      if (!a) throw new Error('Không tìm thấy con rồng nào của bạn.');

      // Đối thủ phải là rồng của NGƯỜI KHÁC, đã nở, đang cử ra trận — lọc ngay
      // trong `where` chứ không lấy về rồi loại.
      const b = await tx.rong.findFirst({
        where: { id: doiThu, noAt: { not: null }, raTran: true, userId: { not: me.userId } },
        select: {
          id: true, loai: true, cap: true, vui: true, vuiTinhAt: true, ten: true,
          mau: true, doi: true, userId: true,
        },
      });
      if (!b) throw new Error('Đối thủ này không còn ở đấu trường nữa.');
      const chuB = { userId: b.userId };

      await grantPoints({
        userId: me.userId, amount: -PHI_DAU, reason: 'RONG_DAU', refId: b.id,
        note: 'Ghi danh đấu trường rồng',
      }, tx);

      const sucA = chiSo({ loai: a.loai, cap: a.cap, doi: a.doi, vui: vuiHienGio(a.vui, a.vuiTinhAt.getTime(), now) });
      const sucB = chiSo({ loai: b.loai, cap: b.cap, doi: b.doi, vui: vuiHienGio(b.vui, b.vuiTinhAt.getTime(), now) });
      const kq = danhNhau(sucA, sucB);

      const duoc = kq.ai === 'a' ? THUONG_THANG : kq.ai === 'hoa' ? PHI_DAU : 0;
      if (duoc > 0) {
        await grantPoints({
          userId: me.userId, amount: duoc, reason: 'RONG_THANG', refId: b.id,
          note: kq.ai === 'a' ? 'Thắng ở đấu trường rồng' : 'Hoà ở đấu trường rồng, hoàn phí',
        }, tx);
      }

      /*
       * Điểm Elo của CẢ HAI BÊN đều đổi, kể cả người bị thách.
       *
       * Nghe thì nghịch với luật "người bị thách không mất gì", nhưng hai thứ
       * ấy khác nhau: ĐIỂM DIỄN ĐÀN là tiền, lấy của người không được hỏi ý là
       * lấy trộm; còn ĐIỂM ELO chỉ là chỗ đứng trên bảng, mà một cái bảng chỉ
       * lên không xuống thì chẳng nói được ai mạnh hơn ai. Con rồng của họ
       * đứng ở đấu trường chính là lời mời đánh.
       *
       * `upsert` cho cả hai: người bị thách có thể chưa từng mở sổ sưu tầm nên
       * chưa có hàng hồ sơ nào.
       */
      const [hoA, hoB] = await Promise.all([
        tx.rongNguoiChoi.upsert({
          where: { userId: me.userId },
          create: { userId: me.userId },
          update: {},
          select: { id: true, diemDau: true },
        }),
        tx.rongNguoiChoi.upsert({
          where: { userId: chuB.userId },
          create: { userId: chuB.userId },
          update: {},
          select: { id: true, diemDau: true },
        }),
      ]);

      const mua = muaCua(new Date(now));
      // Hoà thì không ai đổi điểm: Elo hoà cần công thức riêng, mà một trận
      // hoà ở đây vốn đã hiếm và hoàn phí — không đáng thêm một nhánh nữa.
      const elo = kq.ai === 'hoa' ? null : diemSauTran(hoA.diemDau, hoB.diemDau, kq.ai === 'a');

      await tx.rongNguoiChoi.update({
        where: { id: hoA.id },
        data: {
          ...(elo ? { diemDau: elo.toi } : {}),
          ...(kq.ai === 'a' ? { thangDau: { increment: 1 } }
            : kq.ai === 'hoa' ? { hoaDau: { increment: 1 } }
              : { thuaDau: { increment: 1 } }),
        },
        select: { id: true },
      });
      await tx.rongNguoiChoi.update({
        where: { id: hoB.id },
        data: {
          ...(elo ? { diemDau: elo.dich } : {}),
          ...(kq.ai === 'b' ? { thangDau: { increment: 1 } }
            : kq.ai === 'hoa' ? { hoaDau: { increment: 1 } }
              : { thuaDau: { increment: 1 } }),
        },
        select: { id: true },
      });

      // Ghi lượt đấu trước khi ghi trận: đây mới là thứ chặn trần ngày, nên
      // nó phải tồn tại kể cả khi hàng `RongTran` sau này bị cascade xoá đi.
      await tx.rongLuotDau.create({
        data: {
          userId: me.userId, doi: duoc - PHI_DAU,
          ketQua: kq.ai === 'a' ? 'thang' : kq.ai === 'hoa' ? 'hoa' : 'thua',
        },
        select: { id: true },
      });

      await tx.rongTran.create({
        data: {
          aId: a.id, bId: b.id,
          thangId: kq.ai === 'a' ? a.id : kq.ai === 'b' ? b.id : null,
          duoc: duoc - PHI_DAU,
          // Prisma đòi kiểu JSON của riêng nó; `Hiep[]` là interface nên không
          // tự khớp dù nội dung hoàn toàn là JSON hợp lệ.
          dienBien: kq.dienBien as unknown as Prisma.InputJsonValue,
          diemDoi: elo?.doi ?? 0,
          mua,
        },
        select: { id: true },
      });

      const tenA = a.ten || tenRong(a.loai, a.mau);
      const tenB = b.ten || tenRong(b.loai, b.mau);
      keLai = {
        dienBien: kq.dienBien,
        ai: kq.ai,
        a: { ten: tenA, loai: a.loai, mau: a.mau, cap: a.cap },
        b: { ten: tenB, loai: b.loai, mau: b.mau, cap: b.cap },
        duoc: duoc - PHI_DAU,
        diemDoi: elo?.doi ?? 0,
      };
      ke = kq.ai === 'a'
        ? `${tenA} hạ ${tenB}, được ${THUONG_THANG - PHI_DAU} điểm!`
        : kq.ai === 'hoa'
          ? `${tenA} và ${tenB} bất phân thắng bại — hoàn lại phí ghi danh.`
          : `${tenA} thua ${tenB}, mất ${PHI_DAU} điểm. Cho nó ăn rồi đấu lại.`;
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. Ghi danh một trận tốn ${PHI_DAU} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không ghép được trận.' };
  }

  lamMoi();
  return { ok: true, ke, tran: keLai };
}

// ─────────────────────────── Lai tạo ───────────────────────────

/**
 * Ghép hai con rồng của mình lấy một quả trứng.
 *
 * Đây là hàm ghi phức tạp nhất của đảo, nên nói rõ chỗ nào chống được gì:
 *
 *  • `lockUsers` — luật "chuồng còn chỗ" là một phép ĐẾM, thứ một câu `where`
 *    không nói được, nên hai tab cùng bấm phải xếp hàng ở đây.
 *  • Mọi điều kiện của cha mẹ (cấp, số lần đã lai, thời gian nghỉ) nằm trong
 *    `where` của câu `updateMany` tăng `soLanLai`. Đọc rồi mới ghi thì giữa
 *    hai bước ấy con rồng có thể vừa lai ở tab khác.
 *  • `count === 0` là huỷ cả giao dịch, kéo luôn khoản tiền vừa trừ về chỗ cũ.
 */
export async function laiTao(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const chaId = docId(formData.get('cha'));
  const meId = docId(formData.get('me'));
  if (!chaId || !meId) return { error: 'Chọn đủ hai con rồng đã.' };
  if (chaId === meId) return { error: 'Phải là hai con khác nhau.' };

  let ke = '';
  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId);

      const dang = await tx.rong.count({ where: { userId: me.userId } });
      if (dang >= CHUONG_TOI_DA) {
        throw new Error(`Chuồng chỉ chứa được ${CHUONG_TOI_DA} con. Thả bớt rồi hẵng lai.`);
      }

      const now = Date.now();
      const nghi = new Date(now - LAI_CHO_MS);
      const dieuKien: Prisma.RongWhereInput = {
        userId: me.userId,
        noAt: { not: null },
        cap: { gte: LAI_CAP_TOI_THIEU },
        soLanLai: { lt: LAI_TOI_DA },
        OR: [{ laiLanCuoi: null }, { laiLanCuoi: { lte: nghi } }],
      };

      const bo = await tx.rong.findMany({
        where: { ...dieuKien, id: { in: [chaId, meId] } },
        take: 2,
        select: { id: true, loai: true, mau: true, doi: true, ten: true, soLanLai: true, laiLanCuoi: true },
      });
      if (bo.length < 2) {
        throw new Error(
          `Cả hai con phải là rồng của bạn, đã nở, từ cấp ${LAI_CAP_TOI_THIEU} trở lên, `
          + `còn lượt lai và đã nghỉ đủ.`,
        );
      }

      await grantPoints({
        userId: me.userId, amount: -GIA_LAI, reason: 'RONG_TRUNG',
        note: 'Lai tạo một quả trứng rồng',
      }, tx);

      // Điều kiện lặp lại NGUYÊN VẸN trong `where`, cộng thêm trạng thái vừa
      // đọc được — hai tab cùng bấm thì tab sau không khớp con nào.
      for (const r of bo) {
        const xong = await tx.rong.updateMany({
          where: { ...dieuKien, id: r.id, soLanLai: r.soLanLai, laiLanCuoi: r.laiLanCuoi },
          data: { soLanLai: { increment: 1 }, laiLanCuoi: new Date(now) },
        });
        if (xong.count === 0) throw new Error('Một trong hai con vừa lai ở nơi khác rồi.');
      }

      const chaR = bo.find((r) => r.id === chaId)!;
      const meR = bo.find((r) => r.id === meId)!;
      const con = bocTrungLai(chaR, meR);

      await tx.rong.create({
        data: {
          userId: me.userId,
          loai: con.loai, mau: con.mau, doi: con.doi,
          chaId: chaR.id, meId: meR.id,
          apXongAt: new Date(now + AP_MS),
        },
        select: { id: true },
      });

      ke = `${chaR.ten || tenRong(chaR.loai, chaR.mau)} và ${meR.ten || tenRong(meR.loai, meR.mau)} `
        + `để lại một quả trứng đời ${con.doi}. Nở ra con gì thì chờ mới biết.`;
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. Lai một quả trứng tốn ${GIA_LAI} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không lai được.' };
  }

  lamMoi();
  return { ok: true, ke };
}

// ─────────────────────────── Mốc sưu tầm ───────────────────────────

/**
 * Lĩnh thưởng một mốc của sổ sưu tầm.
 *
 * Số con trong sổ đếm LẠI ở đây chứ không đọc cột `daSuuTam`: cột ấy là bản
 * chép để xếp hạng, mà đây là chỗ phát điểm thật. Trình duyệt cũng không gửi
 * lên mốc nào — máy chủ tự suy ra từ số đếm.
 */
export async function nhanMocSuuTam(_prev: RongState, _formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  let ke = '';
  try {
    await db.$transaction(async (tx) => {
      const ho = await tx.rongNguoiChoi.findUnique({
        where: { userId: me.userId },
        select: { id: true, mocDaNhan: true },
      });
      if (!ho) throw new Error('Bạn chưa nở con rồng nào cả.');

      const daCo = await demSuuTam(tx, me.userId);
      const dat = mocDatDuoc(daCo);
      if (dat <= ho.mocDaNhan) throw new Error('Chưa tới mốc nào mới.');

      // Lĩnh MỘT mốc mỗi lần bấm, đúng mốc kế tiếp — để lời nhắn nói được rõ
      // vừa đạt mốc nào và được bao nhiêu.
      const moc = MOC_SUU_TAM[ho.mocDaNhan];
      if (!moc) throw new Error('Chưa tới mốc nào mới.');

      // Mốc cũ nằm trong `where`: hai tab cùng bấm thì tab sau đếm được 0 dòng
      // và `throw` kéo luôn khoản thưởng vừa phát về chỗ cũ.
      const xong = await tx.rongNguoiChoi.updateMany({
        where: { id: ho.id, mocDaNhan: ho.mocDaNhan },
        data: { mocDaNhan: ho.mocDaNhan + 1, daSuuTam: daCo },
      });
      if (xong.count === 0) throw new Error('Bạn vừa lĩnh mốc này ở nơi khác rồi.');

      await grantPoints({
        userId: me.userId, amount: moc.thuong, reason: 'RONG_THANG',
        note: `Sưu tầm đủ ${moc.so} con rồng`,
      }, tx);

      ke = `Sưu tầm đủ ${moc.so} con — thưởng ${moc.thuong} điểm!`;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không lĩnh được thưởng.' };
  }

  lamMoi();
  return { ok: true, ke };
}

// ─────────────────────────── Cửa hàng ───────────────────────────

/**
 * Mua một món đồ.
 *
 * Trình duyệt gửi lên MÃ MÓN và SỐ LƯỢNG, không gửi giá — giá đọc từ mảng hằng
 * `RONG_DO` ở đây. Số lượng thì kẹp về `1..MUA_TOI_DA`, nên có gửi lên chín
 * nghìn cũng chỉ mua được mười, và tiền vẫn trừ đúng bấy nhiêu.
 */
export async function muaDo(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const mon = timDo(String(formData.get('ma') ?? ''));
  if (!mon) return { error: 'Cửa hàng không bán món này.' };

  const so = Math.max(1, Math.min(MUA_TOI_DA, Math.floor(Number(formData.get('so')) || 1)));
  const tien = mon.gia * so;

  try {
    await db.$transaction(async (tx) => {
      await grantPoints({
        userId: me.userId, amount: -tien, reason: 'RONG_AN',
        note: `Mua ${so} ${mon.ten}`,
      }, tx);

      // `@@unique([chuId, ma])` khiến `upsert` + `increment` an toàn mà không
      // cần khoá hàng người dùng: hai tab cùng bấm thì cộng dồn, không đè nhau.
      await tx.rongDo.upsert({
        where: { chuId_ma: { chuId: me.userId, ma: mon.ma } },
        create: { chuId: me.userId, ma: mon.ma, soLuong: so },
        update: { soLuong: { increment: so } },
        select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: `Không đủ điểm. ${so} ${mon.ten} tốn ${tien} điểm.` };
    return { error: e instanceof Error ? e.message : 'Không mua được.' };
  }

  lamMoi();
  return { ok: true, ke: `Đã mua ${so} ${mon.ten}.` };
}

/**
 * Dùng một món lên một con rồng.
 *
 * Trừ đồ TRƯỚC, bằng một câu ghi có điều kiện mang theo `soLuong: { gte: 1 }`:
 * hai tab cùng bấm thì tab sau đếm được 0 dòng và không có tác dụng nào. Tác
 * dụng nằm trong CÙNG giao dịch, nên món trừ rồi mà con rồng không đổi được là
 * cả hai cùng quay về chỗ cũ.
 */
export async function dungDo(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const mon = timDo(String(formData.get('ma') ?? ''));
  if (!mon) return { error: 'Không có món nào như vậy.' };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Chọn con rồng muốn dùng đã.' };

  let ke = '';
  try {
    await db.$transaction(async (tx) => {
      const bot = await tx.rongDo.updateMany({
        where: { chuId: me.userId, ma: mon.ma, soLuong: { gte: 1 } },
        data: { soLuong: { decrement: 1 } },
      });
      if (bot.count === 0) throw new Error(`Bạn không còn ${mon.ten} nào.`);

      // Trứng và rồng đã nở là hai đích khác hẳn nhau, và điều kiện ấy nằm
      // trong `where` chứ không kiểm sau: đá thúc nở mà dùng lên con đã nở thì
      // chẳng có gì để nở cả.
      const r = await tx.rong.findFirst({
        where: { id, userId: me.userId, noAt: mon.choTrung ? null : { not: null } },
        select: {
          id: true, ten: true, loai: true, mau: true, cap: true, exp: true,
          vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
        },
      });
      if (!r) {
        throw new Error(mon.choTrung
          ? 'Món này dùng cho trứng đang ấp.'
          : 'Món này dùng cho rồng đã nở.');
      }

      const now = Date.now();
      const ten = r.ten || tenRong(r.loai, r.mau);
      const vuiGio = vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now);

      if (mon.viec === 'no') {
        const xong = await tx.rong.updateMany({
          where: { id: r.id, userId: me.userId, noAt: null },
          data: {
            noAt: new Date(now), vui: 60, vuiTinhAt: new Date(now),
            doNo: 70, noTinhAt: new Date(now),
            theLuc: TOI_DA_CHAM, lucTinhAt: new Date(now),
          },
        });
        if (xong.count === 0) throw new Error('Quả trứng này vừa nở ở nơi khác rồi.');

        const daCo = await demSuuTam(tx, me.userId);
        await tx.rongNguoiChoi.upsert({
          where: { userId: me.userId },
          create: { userId: me.userId, daSuuTam: daCo },
          update: { daSuuTam: daCo },
          select: { id: true },
        });
        ke = `Trứng nở rồi — một chú ${tenRong(r.loai, r.mau)}!`;
        return;
      }

      if (mon.viec === 'lai') {
        await tx.rong.updateMany({
          where: { id: r.id, userId: me.userId },
          data: { laiLanCuoi: null },
        });
        ke = `${ten} nghỉ đủ rồi, ghép lại được ngay.`;
        return;
      }

      if (mon.viec === 'vui') {
        await tx.rong.updateMany({
          where: { id: r.id, userId: me.userId },
          data: { vui: Math.min(TOI_DA_CHAM, vuiGio + mon.so), vuiTinhAt: new Date(now) },
        });
        ke = `${ten} ăn ${mon.ten}, vui hẳn lên.`;
        return;
      }

      // Còn lại là hai món cộng kinh nghiệm: thịt tính theo bữa ăn nhân lên,
      // sách thì cộng thẳng con số của nó.
      const them = mon.viec === 'an' ? EXP_MOI_BUA * mon.so : mon.so;
      const sau = lenCap(r.cap, r.exp + them);
      await tx.rong.updateMany({
        where: { id: r.id, userId: me.userId },
        data: {
          cap: sau.cap, exp: sau.exp,
          ...(mon.viec === 'an'
            ? {
              vui: Math.min(TOI_DA_CHAM, vuiGio + 8), vuiTinhAt: new Date(now),
              // Thịt thượng hạng làm no HẲN: nó là món bỏ qua mọi điều kiện,
              // mà điều kiện của bữa ăn thường bây giờ chính là độ no.
              doNo: TOI_DA_CHAM, noTinhAt: new Date(now),
              anLanCuoi: new Date(now),
            }
            : {}),
        },
      });
      ke = sau.len
        ? `${ten} dùng ${mon.ten} và lên cấp ${sau.cap}!`
        : `${ten} dùng ${mon.ten}, +${them} kinh nghiệm.`;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không dùng được món này.' };
  }

  lamMoi();
  return { ok: true, ke };
}

// ─────────────────────────── Thả rồng ───────────────────────────

export async function thaRong(_prev: RongState, formData: FormData): Promise<RongState> {
  const me = await nguoiNuoi();
  if ('error' in me) return { error: me.error };

  const id = docId(formData.get('rong'));
  if (!id) return { error: 'Thiếu con rồng cần thả.' };

  const xong = await db.rong.deleteMany({ where: { id, userId: me.userId } });
  if (xong.count === 0) return { error: 'Không tìm thấy con rồng nào của bạn.' };

  lamMoi();
  // Bộ sưu tập không mất gì: nó đếm theo lượt đã NỞ, mà lịch sử ấy nằm ở
  // những con còn lại và ở chính các trận đã đấu.
  return { ok: true, ke: 'Đã thả nó về trời. Chuồng rộng thêm một chỗ.' };
}
