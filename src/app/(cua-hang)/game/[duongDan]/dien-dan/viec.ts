'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';
import { guiThongBao } from '@/lib/thong-bao';
import { bocTenNhac } from '@/lib/nhac-ten-const';
import { NHAN_MAC_DINH, laNhan } from '@/lib/nhan-chu-de-const';
import { CAU_HOI_TOI_DA, IT_NHAT, LUA_CHON_TOI_DA, NHIEU_NHAT } from '@/lib/binh-chon-const';
import { soTrang } from '@/lib/tien-ich';
import { dungChuoiTimChuDe } from '@/lib/tim-kiem-const';
import { khopLaiChuDe } from '@/lib/khop-chu-de';
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

  /*
   * Nhãn phải CÓ TRONG BẢNG, không nhận bừa thứ biểu mẫu gửi lên.
   *
   * Gõ bừa thì Prisma ném lỗi enum và cả bài viết vừa soạn mất trắng — người
   * viết chẳng làm gì sai. Lùi về nhãn nhẹ nhất thì bài vẫn đăng được, và
   * người ta tự đổi lại được.
   */
  const nhanNhap = String(form.get('nhan') ?? '');
  const nhan = laNhan(nhanNhap) ? nhanNhap : NHAN_MAC_DINH;

  /*
   * Chuyên mục cũng phải CÓ THẬT, và tra bằng chính lượt đọc này.
   *
   * Biểu mẫu gửi lên một mã tuỳ ý, nên không tra thì Prisma ném lỗi khoá ngoại
   * và bài vừa soạn mất trắng. Mã lạ thì lùi về KHÔNG mục nào — bài vẫn đăng
   * được, vẫn đọc được, và người viết tự xếp lại mục sau.
   */
  const maMuc = String(form.get('chuyenMuc') ?? '').trim();
  const muc = maMuc
    ? await db.chuyenMuc.findUnique({ where: { duongDan: maMuc }, select: { id: true } })
    : null;

  const chuDe = await db.chuDe.create({
    // `timKiem` dựng ngay lúc ghi, không tính lúc đọc: cột sẵn thì thêm được
    // chỉ mục, còn bỏ dấu từng dòng lúc truy vấn thì CSDL phải quét cả bảng.
    data: {
      gameId: game.id, nguoiId: nguoi.id, tieuDe, noiDung,
      nhan: nhan as 'TAN_GAU',
      chuyenMucId: muc?.id ?? null,
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

  /*
   * VIẾT BÀI LÀ TỰ THEO DÕI CHỦ ĐỀ.
   *
   * Không bắt người ta bấm thêm một nút: đã bỏ công viết một bài thì gần như
   * chắc chắn muốn biết ai đáp lại. Ai không muốn thì tắt bằng đúng cái nút ấy
   * ngay trên trang.
   *
   * `skipDuplicates` để bài thứ hai trong cùng chủ đề không vỡ vì trùng khoá.
   */
  await db.theoDoiChuDe.createMany({
    data: [{ chuDeId, nguoiId: nguoi.id }], skipDuplicates: true,
  }).catch(() => {});

  /*
   * BÁO CHO NGƯỜI ĐƯỢC NHẮC TÊN.
   *
   * Đặt TRƯỚC danh sách theo dõi và gộp vào cùng một danh sách "đã báo": người
   * vừa được gọi thẳng tên mà lại nhận hai tin — một "có người nhắc bạn", một
   * "chủ đề bạn theo dõi có bài mới" — thì tin thứ hai chỉ là tiếng ồn.
   *
   * Tra tên trong MỘT câu truy vấn, và điều kiện `xoaLuc: null` nằm trong
   * `where`: gõ `@` một tài khoản đã xoá thì không đánh thức nó dậy.
   */
  const tenNhac = bocTenNhac(noiDung);
  const nguoiNhac = tenNhac.length > 0
    ? await db.nguoiDung.findMany({
      where: { tenDangNhap: { in: tenNhac }, xoaLuc: null, khoa: false },
      select: { id: true },
    })
    : [];

  for (const n of nguoiNhac) {
    await guiThongBao({
      nguoiNhanId: n.id,
      nguoiGayRaId: nguoi.id,
      loai: 'DUOC_NHAC_TEN',
      tieuDe: `${nguoi.tenHienThi} nhắc tên bạn`,
      chiTiet: chuDe.tieuDe,
      duongDan: `/game/${duongDan}/dien-dan/${chuDeId}#tl-${bai.id}`,
    });
  }

  /*
   * BÁO CHO NGƯỜI THEO DÕI — trừ mấy người đã báo hoặc không cần báo.
   *
   * Lọc ngay trong `where` chứ không lấy hết rồi lọc trong JavaScript: chủ đề
   * đông người thì đó là chênh lệch giữa vài hàng với vài trăm hàng kéo về chỉ
   * để vứt đi. `TRAN_BAO` là chốt chặn cuối: một chủ đề nghìn người theo dõi mà
   * gửi nghìn thông báo trong cùng một lượt yêu cầu thì người vừa bấm Gửi phải
   * ngồi đợi hết chỗ ấy.
   */
  const TRAN_BAO = 200;
  const daBao = [
    nguoi.id, chuDe.nguoiId, traLoiCho?.nguoiId, ...nguoiNhac.map((n) => n.id),
  ].filter(Boolean) as string[];
  const nguoiTheoDoi = await db.theoDoiChuDe.findMany({
    where: { chuDeId, nguoiId: { notIn: daBao } },
    orderBy: { taoLuc: 'asc' },
    take: TRAN_BAO,
    select: { nguoiId: true },
  });

  for (const t of nguoiTheoDoi) {
    await guiThongBao({
      nguoiNhanId: t.nguoiId,
      nguoiGayRaId: nguoi.id,
      loai: 'TRA_LOI_CHU_DE',
      tieuDe: `${nguoi.tenHienThi} vừa viết trong chủ đề bạn theo dõi`,
      chiTiet: chuDe.tieuDe,
      duongDan: `/game/${duongDan}/dien-dan/${chuDeId}#tl-${bai.id}`,
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
    /*
     * `suaLuc` ghi tay ở đây, KHÔNG dùng `@updatedAt`.
     *
     * Cột `@updatedAt` nhảy theo mọi lượt ghi — kể cả lúc cửa hàng tự cộng
     * `soTraLoi` hay tự đặt lời giải — rồi trang in "đã sửa" lên một bài mà
     * chủ nó chưa hề đụng vào. Chữ ấy nói với người đọc rằng nội dung đã đổi
     * sau khi họ có thể đã đọc, nên chỉ chính lượt sửa mới được ghi.
     */
    data: {
      tieuDe, noiDung, suaLuc: new Date(),
      timKiem: dungChuoiTimChuDe({ tieuDe, noiDung }),
    },
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
    // `suaLuc` ghi tay, cùng lẽ với `suaChuDe` ở trên.
    data: { noiDung, suaLuc: new Date() },
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
 * Xoá lời đáp của chính mình, và khớp lại bộ đếm trong cùng giao dịch.
 *
 * Cả `soTraLoi` lẫn `traLoiCuoiLuc`, qua `khopLaiChuDe` — xem chú thích ở đó
 * về chuyện vì sao cột mốc là cột dễ quên nhất.
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

    await khopLaiChuDe(tx, t.chuDeId);
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

/**
 * Bật / tắt theo dõi một chủ đề.
 *
 * KHÔNG nhận "bật hay tắt" từ biểu mẫu mà tự lật trạng thái đang có: nút trên
 * trang có thể đã cũ vài phút — người ta mở hai tab — nên nghe theo nó thì bấm
 * "Theo dõi" ở tab cũ lại hoá ra huỷ theo dõi. Đọc rồi lật là đúng thứ người
 * bấm mong đợi.
 *
 * Cả hai nhánh đều là MỘT câu lệnh, và cả hai đều nuốt lỗi trùng: bấm hai lần
 * thật nhanh thì lượt sau gặp đúng hàng lượt trước vừa ghi, mà khoá chính là
 * cặp (chủ đề, người) nên không bao giờ đẻ ra hàng thứ hai.
 */
export async function latTheoDoi(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để theo dõi chủ đề.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const duongDan = String(form.get('duongDan') ?? '');

  // Chủ đề phải có thật và thuộc một game đang bày — chặn trong `where`.
  const co = await db.chuDe.findFirst({
    where: { id: chuDeId, game: { trangThai: 'DANG_HIEN' } }, select: { id: true },
  });
  if (!co) return { loi: 'Chủ đề này không còn.' };

  const dangTheo = await db.theoDoiChuDe.findUnique({
    where: { chuDeId_nguoiId: { chuDeId, nguoiId: nguoi.id } }, select: { chuDeId: true },
  });

  if (dangTheo) {
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId, nguoiId: nguoi.id } });
  } else {
    await db.theoDoiChuDe.createMany({
      data: [{ chuDeId, nguoiId: nguoi.id }], skipDuplicates: true,
    });
  }

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
  return {};
}

/**
 * Bấm / bỏ bấm "hữu ích" cho một bài trong diễn đàn.
 *
 * VÌ SAO CÓ CẢ CÁI NÀY BÊN CẠNH LỜI GIẢI: lời giải chỉ đánh dấu được MỘT bài
 * và chỉ chủ chủ đề đánh dấu được, nhưng một chủ đề thường có mấy câu trả lời
 * đều đáng đọc, mà người hỏi thì hay biến mất sau khi xong việc. Phiếu hữu ích
 * để chính người đọc sau đẩy mấy câu ấy nổi lên, không phải chờ ai cho phép.
 *
 * TỰ LẬT trạng thái đang có, không nghe biểu mẫu nói "bật hay tắt": nút trên
 * trang có thể đã cũ vài phút.
 *
 * Xoá rồi ghi nằm trong CÙNG MỘT giao dịch, và con số đếm sẵn cộng trừ ngay
 * trong đó — tách ra là có khe cho lượt bấm thứ hai chen vào giữa. Chép đúng
 * lối `bamHuuIch` của đánh giá, kể cả chỗ chặn sàn 0: một cái "−1 người thấy
 * hữu ích" in ra màn hình thì không cứu được nữa.
 *
 * Không cho bấm bài của chính mình, và điều kiện ấy nằm trong `where` của câu
 * tìm bài chứ không lọc sau: hàm này là một địa chỉ POST công khai.
 */
export async function bamHuuIchTraLoi(traLoiId: string): Promise<
  { loi?: string; ok?: boolean; dem?: number; daBam?: boolean }
> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để bình chọn.' }; }

  const bai = await db.traLoi.findFirst({
    where: {
      id: traLoiId,
      nguoiId: { not: nguoi.id },
      chuDe: { game: { trangThai: 'DANG_HIEN' } },
    },
    select: { id: true, chuDeId: true, chuDe: { select: { game: { select: { duongDan: true } } } } },
  });
  if (!bai) return { loi: 'Không bình chọn được bài này.' };

  const kq = await db.$transaction(async (tx) => {
    const bo = await tx.traLoiHuuIch.deleteMany({ where: { traLoiId, nguoiId: nguoi.id } });
    if (bo.count > 0) {
      const sau = await tx.traLoi.update({
        where: { id: traLoiId },
        data: { soHuuIch: { decrement: 1 } },
        select: { soHuuIch: true },
      });
      if (sau.soHuuIch < 0) {
        await tx.traLoi.update({
          where: { id: traLoiId }, data: { soHuuIch: 0 }, select: { id: true },
        });
        return { dem: 0, daBam: false };
      }
      return { dem: sau.soHuuIch, daBam: false };
    }

    await tx.traLoiHuuIch.create({
      data: { traLoiId, nguoiId: nguoi.id }, select: { traLoiId: true },
    });
    const sau = await tx.traLoi.update({
      where: { id: traLoiId },
      data: { soHuuIch: { increment: 1 } },
      select: { soHuuIch: true },
    });
    return { dem: sau.soHuuIch, daBam: true };
  });

  revalidatePath(`/game/${bai.chuDe.game.duongDan}/dien-dan/${bai.chuDeId}`);
  return { ok: true, ...kq };
}

/**
 * Gắn một cuộc bình chọn vào chủ đề của mình.
 *
 * AI GẮN ĐƯỢC: người mở chủ đề, và ban quản trị. Điều kiện ấy nằm trong `where`
 * của câu tìm chủ đề chứ không lọc sau — hàm này là một địa chỉ POST công khai.
 *
 * MỖI CHỦ ĐỀ NHIỀU NHẤT MỘT cuộc: ràng buộc nằm ở `@unique` trên `chuDeId`
 * trong lược đồ, nên hai lượt bấm thật nhanh không đẻ ra hai cuộc. Ở đây vẫn
 * hỏi trước một câu để báo cho người bấm biết vì sao trượt, thay vì ném ra một
 * lỗi cơ sở dữ liệu.
 */
export async function taoBinhChon(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const duongDan = String(form.get('duongDan') ?? '');
  const cauHoi = String(form.get('cauHoi') ?? '').trim().slice(0, CAU_HOI_TOI_DA);
  const nhieuLuaChon = form.get('nhieuLuaChon') !== null;

  if (cauHoi.length < 5) return { loi: 'Câu hỏi cần ít nhất 5 ký tự.' };

  /*
   * Bỏ hẳn mấy ô để trống thay vì báo lỗi.
   *
   * Biểu mẫu bày sẵn sáu ô cho người ta khỏi phải bấm thêm; ai chỉ cần ba lựa
   * chọn thì để trống ba ô cuối, và đó là chuyện thường chứ không phải sai.
   */
  const luaChon = Array.from({ length: NHIEU_NHAT }, (_, i) =>
    String(form.get(`luaChon-${i}`) ?? '').trim().slice(0, LUA_CHON_TOI_DA))
    .filter(Boolean);

  if (luaChon.length < IT_NHAT) {
    return { loi: `Cần ít nhất ${IT_NHAT} lựa chọn — một đáp án thì không phải bình chọn.` };
  }
  if (new Set(luaChon.map((x) => x.toLowerCase())).size !== luaChon.length) {
    return { loi: 'Có hai lựa chọn trùng nhau.' };
  }

  const laQuanTri = nguoi.vaiTro === 'QUAN_TRI';
  const chuDe = await db.chuDe.findFirst({
    where: {
      id: chuDeId,
      ...(laQuanTri ? {} : { nguoiId: nguoi.id }),
      game: { trangThai: 'DANG_HIEN' },
    },
    select: { id: true, binhChon: { select: { id: true } } },
  });
  if (!chuDe) return { loi: 'Chỉ người mở chủ đề hoặc ban quản trị gắn được bình chọn.' };
  if (chuDe.binhChon) return { loi: 'Chủ đề này đã có một cuộc bình chọn rồi.' };

  await db.binhChon.create({
    data: {
      chuDeId, cauHoi, nhieuLuaChon,
      luaChon: { create: luaChon.map((noiDung, thuTu) => ({ noiDung, thuTu })) },
    },
    select: { id: true },
  });

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
  return {};
}

/** Gỡ cuộc bình chọn khỏi chủ đề. Phiếu đi theo bằng `Cascade`. */
export async function xoaBinhChon(chuDeId: string, duongDan: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập.' }; }

  const laQuanTri = nguoi.vaiTro === 'QUAN_TRI';
  const { count } = await db.binhChon.deleteMany({
    where: {
      chuDeId,
      chuDe: laQuanTri ? {} : { nguoiId: nguoi.id },
    },
  });
  if (count === 0) return { loi: 'Không gỡ được cuộc bình chọn này.' };

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
  return {};
}

/**
 * Bỏ phiếu — hoặc rút phiếu — cho một lựa chọn.
 *
 * BA LUẬT, và cả ba đều nằm trong CÙNG MỘT giao dịch với phép cộng trừ con số
 * đếm sẵn; tách ra là có khe cho lượt bấm thứ hai chen vào giữa:
 *
 *   • bấm lại đúng ô đang chọn thì RÚT phiếu — không có lối rút thì người bấm
 *     nhầm mắc kẹt vĩnh viễn với một lựa chọn họ không muốn;
 *   • cuộc CHỈ MỘT đáp án thì chọn ô mới tự bỏ ô cũ, chứ không chối lượt bấm:
 *     chối thì người ta phải tự đoán ra là mình cần đi rút phiếu cũ trước;
 *   • chủ đề khoá thì thôi, và điều kiện ấy nằm trong `where`.
 */
export async function boPhieu(luaChonId: string): Promise<KetQua & { ok?: boolean }> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để bình chọn.' }; }

  const oChon = await db.luaChon.findFirst({
    where: {
      id: luaChonId,
      binhChon: { chuDe: { khoa: false, game: { trangThai: 'DANG_HIEN' } } },
    },
    select: {
      id: true,
      binhChonId: true,
      binhChon: {
        select: {
          nhieuLuaChon: true,
          chuDeId: true,
          chuDe: { select: { game: { select: { duongDan: true } } } },
        },
      },
    },
  });
  if (!oChon) return { loi: 'Không bình chọn được lúc này.' };

  await db.$transaction(async (tx) => {
    const daBam = await tx.phieu.deleteMany({ where: { luaChonId, nguoiId: nguoi.id } });
    if (daBam.count > 0) {
      const sau = await tx.luaChon.update({
        where: { id: luaChonId },
        data: { soPhieu: { decrement: 1 } },
        select: { soPhieu: true },
      });
      // Sàn 0, cùng lẽ với phiếu hữu ích: một con số âm in ra màn hình thì
      // không cứu được nữa.
      if (sau.soPhieu < 0) {
        await tx.luaChon.update({
          where: { id: luaChonId }, data: { soPhieu: 0 }, select: { id: true },
        });
      }
      return;
    }

    if (!oChon.binhChon.nhieuLuaChon) {
      // Cuộc một đáp án: gỡ mọi phiếu cũ của người này trong CHÍNH cuộc ấy.
      const cu = await tx.phieu.findMany({
        where: { nguoiId: nguoi.id, luaChon: { binhChonId: oChon.binhChonId } },
        select: { luaChonId: true },
      });
      if (cu.length > 0) {
        await tx.phieu.deleteMany({
          where: { nguoiId: nguoi.id, luaChonId: { in: cu.map((x) => x.luaChonId) } },
        });
        for (const x of cu) {
          /*
           * SÀN 0 ở đây nữa, không chỉ ở nhánh rút phiếu phía trên.
           *
           * Hai nhánh cùng trừ một con số đếm sẵn mà chỉ một nhánh có sàn thì
           * cái sàn ấy là sàn thủng: chỉ cần hàng `Phieu` còn đó mà `soPhieu`
           * đã về 0 — vì một lượt dọn tay, hay một lần ghi hỏng nửa chừng từ
           * đời nào — là lượt đổi phiếu kế tiếp đẩy nó xuống âm, rồi phần trăm
           * in ra màn hình thành số âm.
           */
          const sau = await tx.luaChon.update({
            where: { id: x.luaChonId },
            data: { soPhieu: { decrement: 1 } },
            select: { soPhieu: true },
          });
          if (sau.soPhieu < 0) {
            await tx.luaChon.update({
              where: { id: x.luaChonId }, data: { soPhieu: 0 }, select: { id: true },
            });
          }
        }
      }
    }

    await tx.phieu.create({
      data: { luaChonId, nguoiId: nguoi.id }, select: { luaChonId: true },
    });
    await tx.luaChon.update({
      where: { id: luaChonId }, data: { soPhieu: { increment: 1 } }, select: { id: true },
    });
  });

  revalidatePath(
    `/game/${oChon.binhChon.chuDe.game.duongDan}/dien-dan/${oChon.binhChon.chuDeId}`,
  );
  return { ok: true };
}
