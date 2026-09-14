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

  /*
   * BÀI ĐƯỢC ĐÁP PHẢI NẰM TRONG CHÍNH CHỦ ĐỀ NÀY.
   *
   * `traLoiChoId` đi kèm biểu mẫu nên ai cũng sửa được. Nhận bừa thì trỏ được
   * sang một bài ở chủ đề khác — trang sẽ in một mẩu trích chẳng liên quan gì,
   * và tệ hơn: người bị trỏ tới nhận một thông báo dẫn về một chủ đề họ chưa
   * từng đặt chân vào. Điều kiện nằm trong `where`, không lọc sau.
   */
  const choId = String(form.get('traLoiChoId') ?? '').trim();
  const traLoiCho = choId
    ? await db.traLoi.findFirst({
      where: { id: choId, chuDeId },
      select: { id: true, nguoiId: true, noiDung: true },
    })
    : null;

  const bai = await db.$transaction(async (tx) => {
    const b = await tx.traLoi.create({
      data: { chuDeId, nguoiId: nguoi.id, noiDung, traLoiChoId: traLoiCho?.id ?? null },
      select: { id: true },
    });
    await tx.chuDe.update({
      where: { id: chuDeId },
      data: { soTraLoi: { increment: 1 }, traLoiCuoiLuc: new Date() },
      select: { id: true },
    });
    return b;
  });

  /*
   * BÁO CHO AI, VÀ CHỈ BÁO MỘT LẦN.
   *
   * Đặt NGOÀI giao dịch trên: mất một thông báo thì tiếc, còn để nó kéo đổ cả
   * bài trả lời vừa viết thì tệ hơn nhiều.
   *
   * Người bị đáp thẳng nhận một thông báo KHÁC hẳn chủ chủ đề: "ai đó đáp bài
   * của bạn" là chuyện của riêng họ, còn "có người trả lời chủ đề" là chuyện
   * của chủ đề. Nhưng nếu hai người ấy là MỘT thì chỉ gửi bản nói rõ hơn —
   * hai thông báo cho cùng một bài viết là phiền chứ không phải chu đáo.
   */
  // Đáp bài của chính mình thì `guiThongBao` tự bỏ qua, không cần chặn ở đây.
  if (traLoiCho) {
    await guiThongBao({
      nguoiNhanId: traLoiCho.nguoiId,
      nguoiGayRaId: nguoi.id,
      loai: 'DAP_BAI_CUA_BAN',
      tieuDe: `${nguoi.tenHienThi} đã đáp lại bài của bạn`,
      chiTiet: chuDe.tieuDe,
      duongDan: `/game/${duongDan}/dien-dan/${chuDeId}#tl-${bai.id}`,
    });
  }

  if (chuDe.nguoiId !== traLoiCho?.nguoiId) {
    await guiThongBao({
      nguoiNhanId: chuDe.nguoiId,
      nguoiGayRaId: nguoi.id,
      loai: 'TRA_LOI_CHU_DE',
      tieuDe: `${nguoi.tenHienThi} đã trả lời chủ đề của bạn`,
      chiTiet: chuDe.tieuDe,
      duongDan: `/game/${duongDan}/dien-dan/${chuDeId}`,
    });
  }

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
 * đổi thì đó là việc của ban quản trị, và họ có nút riêng.
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

/**
 * Chọn — hoặc bỏ chọn — một bài làm lời giải của chủ đề.
 *
 * AI ĐƯỢC CHỌN: chủ chủ đề, và ban quản trị. Chủ chủ đề vì họ là người biết
 * câu nào gỡ được đúng chuyện của mình; ban quản trị vì người hỏi hay biến mất
 * sau khi xong việc, để lại một chủ đề có lời giải mà không ai đánh dấu được.
 *
 * Điều kiện quyền nằm trong `where` của `updateMany` rồi xét `count`, không
 * phải một câu `if` đọc trước ghi sau: hàm này là địa chỉ POST công khai, và
 * giữa lượt đọc với lượt ghi là một khe hở.
 *
 * BÀI PHẢI NẰM TRONG CHÍNH CHỦ ĐỀ NÀY. Không kiểm thì trỏ được sang bài ở chủ
 * đề khác, và trang sẽ ghim lên đầu một câu trả lời cho câu hỏi nào đó khác
 * hẳn — tệ hơn là không có lời giải nào.
 */
export async function datLoiGiai(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const duongDan = String(form.get('duongDan') ?? '');
  const traLoiId = String(form.get('traLoiId') ?? '').trim();
  const bo = form.get('bo') !== null;

  const laQuanTri = nguoi.vaiTro === 'QUAN_TRI';
  const locChu = laQuanTri ? {} : { nguoiId: nguoi.id };

  if (bo) {
    const n = await db.chuDe.updateMany({
      where: { id: chuDeId, ...locChu }, data: { loiGiaiId: null },
    });
    if (n.count === 0) return { loi: 'Chỉ người mở chủ đề hoặc ban quản trị làm được việc này.' };
    revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
    revalidatePath(`/game/${duongDan}/dien-dan`);
    return {};
  }

  const bai = await db.traLoi.findFirst({
    where: { id: traLoiId, chuDeId },
    select: { id: true, nguoiId: true },
  });
  if (!bai) return { loi: 'Bài này không nằm trong chủ đề.' };

  const n = await db.chuDe.updateMany({
    where: { id: chuDeId, ...locChu }, data: { loiGiaiId: bai.id },
  });
  if (n.count === 0) return { loi: 'Chỉ người mở chủ đề hoặc ban quản trị làm được việc này.' };

  const chuDe = await db.chuDe.findUnique({
    where: { id: chuDeId }, select: { tieuDe: true },
  });
  await guiThongBao({
    nguoiNhanId: bai.nguoiId,
    nguoiGayRaId: nguoi.id,
    loai: 'BAI_THANH_LOI_GIAI',
    tieuDe: 'Bài của bạn được chọn làm lời giải',
    chiTiet: chuDe?.tieuDe ?? null,
    duongDan: `/game/${duongDan}/dien-dan/${chuDeId}#tl-${bai.id}`,
  });

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
  revalidatePath(`/game/${duongDan}/dien-dan`);
  return {};
}
