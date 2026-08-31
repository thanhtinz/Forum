'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { banMessage, getActiveBan } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { bocRongNgauNhien, danhNhau, demSuuTam } from '@/lib/rong';
import {
  AN_CHO_MS, AP_MS, CHOI_CHO_MS, CHUONG_TOI_DA, DAU_MOI_NGAY, EXP_MOI_BUA,
  EXP_MOI_LAN_CHOI, GIA_AN, GIA_NO_NGAY, GIA_TRUNG, PHI_DAU, THUONG_THANG,
  VUI_MOI_LAN, CAP_TOI_DA, MOC_SUU_TAM, chiSo, dauNgayVN, expCanDe, loiTenRong,
  mocDatDuoc, tenRong, vuiHienGio,
} from '@/lib/rong-const';

/**
 * Đảo rồng — chín thao tác đổi dữ liệu.
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
        data: { noAt: now, vui: 60, vuiTinhAt: now },
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
        select: { cap: true, exp: true, vui: true, vuiTinhAt: true, anLanCuoi: true, ten: true, loai: true, mau: true },
      });
      if (!r) throw new Error('Không tìm thấy con rồng nào của bạn.');

      const now = Date.now();
      const chờ = (r.anLanCuoi?.getTime() ?? 0) + AN_CHO_MS;
      if (now < chờ) throw new Error('Nó vừa ăn xong, còn no. Lát nữa hẵng cho ăn tiếp.');

      await grantPoints({
        userId: me.userId, amount: -GIA_AN, reason: 'RONG_AN', refId: id,
        note: 'Mua thức ăn cho rồng',
      }, tx);

      const sau = lenCap(r.cap, r.exp + EXP_MOI_BUA);
      const vuiMoi = Math.min(100, vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now) + 8);

      // `anLanCuoi` nằm trong `where`: hai tab cùng bấm thì tab sau không khớp
      // và `throw` kéo luôn khoản tiền vừa trừ về chỗ cũ.
      const xong = await tx.rong.updateMany({
        where: { id, userId: me.userId, anLanCuoi: r.anLanCuoi },
        data: {
          cap: sau.cap, exp: sau.exp, vui: vuiMoi,
          vuiTinhAt: new Date(now), anLanCuoi: new Date(now),
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
    select: { cap: true, exp: true, vui: true, vuiTinhAt: true, choiLanCuoi: true, ten: true, loai: true, mau: true },
  });
  if (!r) return { error: 'Không tìm thấy con rồng nào của bạn.' };

  const now = Date.now();
  if (now < (r.choiLanCuoi?.getTime() ?? 0) + CHOI_CHO_MS) {
    return { error: 'Nó đang mệt, để nó nghỉ một lát đã.' };
  }

  const sau = lenCap(r.cap, r.exp + EXP_MOI_LAN_CHOI);
  const vuiMoi = Math.min(100, vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now) + VUI_MOI_LAN);

  const xong = await db.rong.updateMany({
    where: { id, userId: me.userId, choiLanCuoi: r.choiLanCuoi },
    data: {
      cap: sau.cap, exp: sau.exp, vui: vuiMoi,
      vuiTinhAt: new Date(now), choiLanCuoi: new Date(now),
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
  try {
    await db.$transaction(async (tx) => {
      // Khoá: trần "mỗi ngày mấy trận" là phép đếm, `where` không nói được.
      await lockUsers(tx, me.userId);

      const now = Date.now();
      /*
       * Đếm trên `MiniGamePlay` chứ KHÔNG trên `RongTran`.
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
       * `MiniGamePlay` không có đường nào để người chơi xoá, và đây cũng đúng
       * bảng mà bầu cua với oẳn tù tì đang dùng để chặn trần ngày.
       */
      const daDau = await tx.miniGamePlay.count({
        where: { userId: me.userId, game: 'RONGDAU', createdAt: { gte: dauNgayVN(now) } },
      });
      if (daDau >= DAU_MOI_NGAY) {
        throw new Error(`Hôm nay bạn đã đấu đủ ${DAU_MOI_NGAY} trận. Mai quay lại nhé.`);
      }

      const a = await tx.rong.findFirst({
        where: { id: cuaToi, userId: me.userId, noAt: { not: null } },
        select: { id: true, loai: true, cap: true, vui: true, vuiTinhAt: true, ten: true, mau: true },
      });
      if (!a) throw new Error('Không tìm thấy con rồng nào của bạn.');

      // Đối thủ phải là rồng của NGƯỜI KHÁC, đã nở, đang cử ra trận — lọc ngay
      // trong `where` chứ không lấy về rồi loại.
      const b = await tx.rong.findFirst({
        where: { id: doiThu, noAt: { not: null }, raTran: true, userId: { not: me.userId } },
        select: { id: true, loai: true, cap: true, vui: true, vuiTinhAt: true, ten: true, mau: true },
      });
      if (!b) throw new Error('Đối thủ này không còn ở đấu trường nữa.');

      await grantPoints({
        userId: me.userId, amount: -PHI_DAU, reason: 'RONG_DAU', refId: b.id,
        note: 'Ghi danh đấu trường rồng',
      }, tx);

      const sucA = chiSo({ loai: a.loai, cap: a.cap, vui: vuiHienGio(a.vui, a.vuiTinhAt.getTime(), now) });
      const sucB = chiSo({ loai: b.loai, cap: b.cap, vui: vuiHienGio(b.vui, b.vuiTinhAt.getTime(), now) });
      const kq = danhNhau(sucA, sucB);

      const duoc = kq.ai === 'a' ? THUONG_THANG : kq.ai === 'hoa' ? PHI_DAU : 0;
      if (duoc > 0) {
        await grantPoints({
          userId: me.userId, amount: duoc, reason: 'RONG_THANG', refId: b.id,
          note: kq.ai === 'a' ? 'Thắng ở đấu trường rồng' : 'Hoà ở đấu trường rồng, hoàn phí',
        }, tx);
      }

      // Ghi lượt chơi trước khi ghi trận: đây mới là thứ chặn trần ngày, nên
      // nó phải tồn tại kể cả khi hàng `RongTran` sau này bị cascade xoá đi.
      await tx.miniGamePlay.create({
        data: {
          userId: me.userId, game: 'RONGDAU', bet: PHI_DAU, delta: duoc - PHI_DAU,
          detail: kq.ai === 'a' ? 'thang' : kq.ai === 'hoa' ? 'hoa' : 'thua',
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
        },
        select: { id: true },
      });

      const tenA = a.ten || tenRong(a.loai, a.mau);
      const tenB = b.ten || tenRong(b.loai, b.mau);
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
