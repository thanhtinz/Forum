'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';
import { guiThongBao } from '@/lib/thong-bao';
import { soTrang } from '@/lib/tien-ich';
import { dungChuoiTimChuDe } from '@/lib/tim-kiem-const';
import { MOI_TRANG_TRA_LOI } from './moi-trang';

export interface KetQua { loi?: string }

const TIEU_DE_TOI_DA = 150;
const NOI_DUNG_TOI_DA = 8000;

/** Mở một chủ đề mới trong khu diễn đàn của một game. */
export async function dangChuDe(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đăng bài.' }; }

  const duongDan = String(form.get('duongDan') ?? '');
  const tieuDe = String(form.get('tieuDe') ?? '').trim();
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (tieuDe.length < 5) return { loi: 'Tiêu đề cần ít nhất 5 ký tự.' };
  if (tieuDe.length > TIEU_DE_TOI_DA) return { loi: `Tiêu đề tối đa ${TIEU_DE_TOI_DA} ký tự.` };
  if (noiDung.length < 10) return { loi: 'Nội dung cần ít nhất 10 ký tự.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Nội dung tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  // Điều kiện "game đang hiện" nằm trong truy vấn: đăng bài vào một game đã bị
  // gỡ thì bài ấy không có chỗ nào hiện ra, coi như mất trắng công người viết.
  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  const chuDe = await db.chuDe.create({
    // `timKiem` dựng ngay lúc ghi, không tính lúc đọc: cột sẵn thì thêm được
    // chỉ mục, còn bỏ dấu từng dòng lúc truy vấn thì CSDL phải quét cả bảng.
    data: {
      gameId: game.id, nguoiId: nguoi.id, tieuDe, noiDung,
      timKiem: dungChuoiTimChuDe({ tieuDe, noiDung }),
    },
    select: { id: true },
  });

  revalidatePath(`/game/${duongDan}`);
  redirect(`/game/${duongDan}/dien-dan/${chuDe.id}`);
}

/**
 * Trả lời một chủ đề.
 *
 * Bộ đếm `soTraLoi` và mốc `traLoiCuoiLuc` cập nhật trong CÙNG giao dịch với
 * bài trả lời. Tách ra hai lần ghi thì chỉ cần một lần lỗi giữa chừng là con
 * số đếm lệch hẳn khỏi số bài thật, và không có gì kéo nó về đúng nữa.
 */
export async function traLoi(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để trả lời.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const duongDan = String(form.get('duongDan') ?? '');
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (noiDung.length < 2) return { loi: 'Hãy viết vài chữ đã.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  // Chủ đề bị khoá thì không nhận thêm bài — kiểm trong `where`, không lọc sau.
  const chuDe = await db.chuDe.findFirst({
    where: { id: chuDeId, khoa: false, game: { trangThai: 'DANG_HIEN' } },
    select: { id: true, tieuDe: true, nguoiId: true },
  });
  if (!chuDe) return { loi: 'Chủ đề này đã khoá hoặc không còn.' };

  const bai = await db.$transaction(async (tx) => {
    const b = await tx.traLoi.create({
      data: { chuDeId, nguoiId: nguoi.id, noiDung }, select: { id: true },
    });
    await tx.chuDe.update({
      where: { id: chuDeId },
      data: { soTraLoi: { increment: 1 }, traLoiCuoiLuc: new Date() },
      select: { id: true },
    });
    return b;
  });

  // Báo cho chủ chủ đề. Đặt NGOÀI giao dịch trên: mất một thông báo thì tiếc,
  // còn để nó kéo đổ cả bài trả lời vừa viết thì tệ hơn nhiều.
  await guiThongBao({
    nguoiNhanId: chuDe.nguoiId,
    nguoiGayRaId: nguoi.id,
    loai: 'TRA_LOI_CHU_DE',
    tieuDe: `${nguoi.tenHienThi} đã trả lời chủ đề của bạn`,
    chiTiet: chuDe.tieuDe,
    duongDan: `/game/${duongDan}/dien-dan/${chuDeId}`,
  });

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);

  /*
   * ĐƯA NGƯỜI VIẾT TỚI ĐÚNG BÀI VỪA GỬI.
   *
   * Chủ đề nay chia trang, nên ở lại chỗ cũ là hỏng: gửi bài từ trang 1 của
   * một chủ đề bốn trang thì bài mới nằm ở trang 4, màn hình không đổi gì
   * cả — và người ta bấm Gửi lần nữa vì tưởng trượt. Tính lại số trang SAU
   * khi đã ghi, nên bài đẩy chủ đề sang trang mới cũng tới đúng nơi.
   */
  const tong = await db.traLoi.count({ where: { chuDeId } });
  const trang = soTrang(tong, MOI_TRANG_TRA_LOI);
  redirect(
    `/game/${duongDan}/dien-dan/${chuDeId}${trang > 1 ? `?trang=${trang}` : ''}#tl-${bai.id}`,
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * SỬA VÀ XOÁ BÀI CỦA CHÍNH MÌNH
 *
 * Trước đây gõ nhầm một chữ là chịu vĩnh viễn. Ở mọi diễn đàn, sửa bài của
 * mình là việc cơ bản nhất sau đăng bài.
 *
 * Điều kiện "bài này của tôi" nằm TRONG `where` của Prisma, không phải đọc ra
 * rồi so `if`. Đọc rồi so thì giữa lúc đọc và lúc ghi có một khe hở, và quan
 * trọng hơn: quên mất câu `if` ấy là chuyện xảy ra được, còn quên một dòng
 * trong `where` thì câu truy vấn không khớp bài nào cả — hỏng về phía an toàn.
 *
 * Chủ đề ĐÃ KHOÁ thì không sửa được nữa, kể cả bài của chính mình: khoá là để
 * chốt lại một cuộc trao đổi, mà sửa được bài cũ thì chốt bằng thừa.
 * ────────────────────────────────────────────────────────────────────────── */

/** Sửa chủ đề của chính mình. */
export async function suaChuDe(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const tieuDe = String(form.get('tieuDe') ?? '').trim();
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (tieuDe.length < 5) return { loi: 'Tiêu đề cần ít nhất 5 ký tự.' };
  if (tieuDe.length > TIEU_DE_TOI_DA) return { loi: `Tiêu đề tối đa ${TIEU_DE_TOI_DA} ký tự.` };
  if (noiDung.length < 10) return { loi: 'Nội dung cần ít nhất 10 ký tự.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Nội dung tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  const { count } = await db.chuDe.updateMany({
    where: { id: chuDeId, nguoiId: nguoi.id, khoa: false },
    // Sửa bài mà quên dựng lại chuỗi tìm thì ô tìm kiếm còn trỏ vào chữ cũ —
    // bài đã sửa tên vẫn ra theo tên cũ, và không ra theo tên mới.
    data: { tieuDe, noiDung, timKiem: dungChuoiTimChuDe({ tieuDe, noiDung }) },
  });
  if (count === 0) return { loi: 'Không sửa được bài này. Có thể bài đã bị khoá hoặc không phải của bạn.' };

  const c = await db.chuDe.findUnique({
    where: { id: chuDeId }, select: { game: { select: { duongDan: true } } },
  });
  if (c) {
    revalidatePath(`/game/${c.game.duongDan}/dien-dan`);
    revalidatePath(`/game/${c.game.duongDan}/dien-dan/${chuDeId}`);
  }
  return {};
}

/**
 * Xoá chủ đề của chính mình.
 *
 * Chỉ cho xoá khi CHƯA AI TRẢ LỜI. Xoá một chủ đề đã có người vào góp chuyện
 * là xoá luôn công của họ — mấy lời đáp ấy đi theo vì `onDelete: Cascade`, và
 * người viết chúng chẳng làm gì sai cả. Muốn gỡ một chủ đề đã thành cuộc trao
 * đổi thì đó là việc của ban quản kho, và họ có nút riêng.
 */
export async function xoaChuDeCuaToi(chuDeId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const c = await db.chuDe.findUnique({
    where: { id: chuDeId }, select: { game: { select: { duongDan: true } } },
  });

  const { count } = await db.chuDe.deleteMany({
    where: { id: chuDeId, nguoiId: nguoi.id, khoa: false, soTraLoi: 0 },
  });
  if (count === 0) {
    return { loi: 'Không xoá được. Chủ đề đã có người trả lời, đã bị khoá, hoặc không phải của bạn.' };
  }

  if (c) revalidatePath(`/game/${c.game.duongDan}/dien-dan`);
  redirect(c ? `/game/${c.game.duongDan}/dien-dan` : '/');
}

/** Sửa một lời đáp của chính mình. */
export async function suaTraLoi(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const traLoiId = String(form.get('traLoiId') ?? '');
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (noiDung.length < 2) return { loi: 'Nội dung cần ít nhất 2 ký tự.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Nội dung tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  // Chủ đề khoá thì lời đáp trong đó cũng đóng băng theo — điều kiện ấy nằm
  // luôn trong `where` qua quan hệ, không phải một lượt đọc riêng.
  const { count } = await db.traLoi.updateMany({
    where: { id: traLoiId, nguoiId: nguoi.id, chuDe: { khoa: false } },
    data: { noiDung },
  });
  if (count === 0) return { loi: 'Không sửa được lời đáp này.' };

  const t = await db.traLoi.findUnique({
    where: { id: traLoiId },
    select: { chuDeId: true, chuDe: { select: { game: { select: { duongDan: true } } } } },
  });
  if (t) revalidatePath(`/game/${t.chuDe.game.duongDan}/dien-dan/${t.chuDeId}`);
  return {};
}

/**
 * Xoá lời đáp của chính mình, và trừ lại bộ đếm trong cùng giao dịch.
 *
 * Đếm lại từ bảng chứ không trừ đi một: trừ tay thì mỗi lần lệch là lệch vĩnh
 * viễn, mà không có chỗ nào phát hiện ra.
 */
export async function xoaTraLoiCuaToi(traLoiId: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const t = await db.traLoi.findUnique({
    where: { id: traLoiId },
    select: { chuDeId: true, chuDe: { select: { game: { select: { duongDan: true } } } } },
  });
  if (!t) return {};

  const xong = await db.$transaction(async (tx) => {
    const { count } = await tx.traLoi.deleteMany({
      where: { id: traLoiId, nguoiId: nguoi.id, chuDe: { khoa: false } },
    });
    if (count === 0) return false;

    const con = await tx.traLoi.count({ where: { chuDeId: t.chuDeId } });
    await tx.chuDe.update({
      where: { id: t.chuDeId }, data: { soTraLoi: con }, select: { id: true },
    });
    return true;
  });

  if (!xong) return { loi: 'Không xoá được lời đáp này.' };

  revalidatePath(`/game/${t.chuDe.game.duongDan}/dien-dan/${t.chuDeId}`);
  return {};
}
