'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap, nguoiHienTai } from '@/lib/xac-thuc';
import { tinhDiemTB } from '@/lib/diem-game-const';
import { DIA_CHI_TOI_DA, laDiaChiHopLe } from '@/lib/dia-chi-an-toan';

export interface KetQua { ok?: boolean; loi?: string }

/**
 * Chấm sao và viết đánh giá. Chấm lại là SỬA bài cũ, không đẻ bài mới.
 *
 * `Game.tongSao` và `Game.soLuotDanhGia` phải khớp lại sau mỗi lần ghi. Cộng
 * dồn thủ công (`tongSao += sao`) thì lúc người ta sửa từ 5 xuống 2 là con số
 * lệch vĩnh viễn, mà không có chỗ nào phát hiện ra. Nên đếm lại từ chính bảng
 * đánh giá, trong CÙNG một giao dịch với lần ghi — đó là thứ luôn đúng.
 */
export async function chamSao(
  gameId: string, sao: number, noiDung: string, tieuDe = '', anh = '',
): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đánh giá.' }; }

  if (!Number.isInteger(sao) || sao < 1 || sao > 5) return { loi: 'Hãy chọn từ 1 đến 5 sao.' };

  const chu = noiDung.trim().slice(0, 2000);
  // Đầu đề ngắn hẳn: nó nằm một dòng trên đầu thẻ đánh giá, dài hơn là tràn
  // hoặc bị cắt giữa chừng — mà một câu chốt bị cắt giữa chừng thì vô nghĩa.
  const de = tieuDe.trim().slice(0, 80);

  const tam = anh.trim();
  /*
   * Ảnh đi THẲNG vào thuộc tính `src` lúc bày, nên nó phải qua đúng bộ kiểm
   * địa chỉ của dự án — không tự so đầu chuỗi.
   *
   * `startsWith('/')` là cái bẫy `dia-chi-an-toan.ts` sinh ra để giết:
   * `//may-chu-la/x.png` và `/\may-chu-la/x.png` đều bắt đầu bằng `/`, mà
   * trình duyệt đọc chúng thành "cùng giao thức, KHÁC MÁY CHỦ". Lọt là cửa
   * hàng bày ảnh của người lạ dưới tên mình, và mỗi lượt xem là một lượt gửi
   * địa chỉ IP người xem sang máy chủ ấy.
   */
  if (tam && (tam.length > DIA_CHI_TOI_DA || !laDiaChiHopLe(tam))) {
    return { loi: 'Ảnh không hợp lệ.' };
  }

  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' },
    select: { duongDan: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  /*
   * BẢN NÀO LÚC CHẤM SAO.
   *
   * Ưu tiên bản CHÍNH NGƯỜI ẤY đã tải — đó mới là bản họ cầm trong tay lúc gõ
   * mấy dòng này. Chưa tải bao giờ (chấm sao vẫn được, cửa hàng không bắt tải
   * mới cho nói) thì lấy bản mới nhất đang bày, vì đó là thứ họ vừa xem.
   *
   * Ghi lại cả lúc SỬA bài cũ: người sửa là người vừa chơi lại, nên tiếng nói
   * ấy thuộc về bản họ đang cầm chứ không phải bản của mấy năm trước.
   */
  const [daTai, banMoi] = await Promise.all([
    db.luotTai.findUnique({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      select: { soHieu: true },
    }),
    db.banTai.findFirst({
      where: { gameId },
      orderBy: [{ moiNhat: 'desc' }, { ngayRa: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      select: { soHieu: true },
    }),
  ]);
  const soHieu = daTai?.soHieu ?? banMoi?.soHieu ?? null;

  await db.$transaction(async (tx) => {
    await tx.danhGia.upsert({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      update: { sao, noiDung: chu || null, tieuDe: de || null, anh: tam || null, soHieu },
      create: {
        gameId, nguoiId: nguoi.id, sao, noiDung: chu || null, tieuDe: de || null,
        anh: tam || null, soHieu,
      },
      select: { id: true },
    });

    const gom = await tx.danhGia.aggregate({
      where: { gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await tx.game.update({
      where: { id: gameId },
      data: {
        tongSao: gom._sum.sao ?? 0,
        soLuotDanhGia: gom._count._all,
        // Ghi cùng lúc với hai con số nó sinh ra từ đó: để lệch pha là bảng
        // "điểm cao nhất" xếp theo một sự thật đã cũ.
        diemTB: tinhDiemTB(gom._sum.sao ?? 0, gom._count._all),
      },
      select: { id: true },
    });
  });

  revalidatePath(`/game/${game.duongDan}`);
  return { ok: true };
}

/**
 * CHẤM SAO MỘT CÚ BẤM — không mở tấm nào, không đụng tới phần chữ.
 *
 * Đây là lối của App Store: bấm vào ngôi sao thứ tư là chấm xong bốn sao, hết.
 * Viết chữ là một việc RIÊNG, và phần lớn người ta không viết — bắt họ đi qua
 * một biểu mẫu chỉ để nói "game này hay" là bắt trả giá cho thứ họ không cần.
 *
 * VÌ SAO KHÔNG GỌI LẠI `chamSao` VỚI CHỮ RỖNG. Hàm ấy ghi `noiDung: chu ||
 * null` — chữ rỗng nghĩa là XOÁ. Nên một cú bấm sao sẽ thổi bay cả bài đánh
 * giá người ta đã viết, kèm tiêu đề và ảnh đính kèm, mà không hỏi một câu.
 * Hàm này chỉ chạm đúng cột `sao`.
 *
 * `update` và `create` tách hẳn nhau trong `upsert` chính vì thế: hàng đã có
 * thì chỉ đổi mỗi điểm sao, hàng chưa có mới dựng mới.
 */
export async function chamSaoNhanh(gameId: string, sao: number): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đánh giá.' }; }

  if (!Number.isInteger(sao) || sao < 1 || sao > 5) return { loi: 'Hãy chọn từ 1 đến 5 sao.' };

  // Điều kiện "game đang bày" nằm trong `where`, không lọc sau: đây là một địa
  // chỉ POST công khai như mọi hàm khác trong tệp này.
  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' },
    select: { duongDan: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  // Bản nào lúc chấm — cùng lẽ với `chamSao`, xem chú thích ở đó.
  const [daTai, banMoi] = await Promise.all([
    db.luotTai.findUnique({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      select: { soHieu: true },
    }),
    db.banTai.findFirst({
      where: { gameId },
      orderBy: [{ moiNhat: 'desc' }, { ngayRa: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      select: { soHieu: true },
    }),
  ]);
  const soHieu = daTai?.soHieu ?? banMoi?.soHieu ?? null;

  await db.$transaction(async (tx) => {
    await tx.danhGia.upsert({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      // CHỈ cột `sao` và `soHieu`. Không nhắc tới `noiDung`, `tieuDe`, `anh` —
      // nhắc tới là ghi đè, mà ở đây không có gì để ghi vào chúng.
      update: { sao, soHieu },
      create: { gameId, nguoiId: nguoi.id, sao, soHieu },
      select: { id: true },
    });

    // Ba cột đếm sẵn khớp lại trong CÙNG giao dịch, đếm lại từ bảng — y hệt
    // `chamSao`, vì lệch một lần là lệch vĩnh viễn.
    const gom = await tx.danhGia.aggregate({
      where: { gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await tx.game.update({
      where: { id: gameId },
      data: {
        tongSao: gom._sum.sao ?? 0,
        soLuotDanhGia: gom._count._all,
        diemTB: tinhDiemTB(gom._sum.sao ?? 0, gom._count._all),
      },
      select: { id: true },
    });
  });

  revalidatePath(`/game/${game.duongDan}`);
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────────────
 * ĐỌC ĐÁNH GIÁ THEO TRANG — cho tấm trượt "tất cả đánh giá"
 *
 * Trang game chỉ bày năm bài mới nhất. Bấm "Xem tất cả" thì mở một tấm trượt
 * đọc tiếp từ đây, chứ không rời trang: người đang cân nhắc tải rất hay đọc
 * vài bài rồi quay lại nhìn nút tải, mà rời trang thì mất chỗ đang đứng.
 *
 * Đây là hàm ĐỌC công khai, và nó cố ý không kiểm quyền: đánh giá của một game
 * đang bày bán thì ai cũng đọc được, y như trên trang. Nhưng điều kiện "game
 * đang hiện" vẫn nằm trong `where` — game đã gỡ thì không được rò ra qua đây.
 * ────────────────────────────────────────────────────────────────────────── */

/* Không `export`: tệp `'use server'` chỉ cho phép export hàm bất đồng bộ, và
   con số này không ai ngoài tệp cần. */
const MOI_TRANG_DANH_GIA = 20;

export interface BaiXem {
  id: string;
  sao: number;
  noiDung: string | null;
  anh: string | null;
  taoLuc: Date;
  traLoi: string | null;
  traLoiAnh: string | null;
  traLoiLuc: Date | null;
  /** Game ở bản nào lúc người ta chấm sao; rỗng với bài chấm từ trước. */
  soHieu: string | null;
  tieuDe: string | null;
  soHuuIch: number;
  /** Người đang xem đã bấm hữu ích cho bài này chưa. Khách thì luôn `false`. */
  toiDaBam: boolean;
  nguoiId: string;
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null };
}

export interface TrangDanhGia {
  bai: BaiXem[];
  /** Tổng số bài KHỚP bộ lọc — để biết còn gì mà tải thêm không. */
  tong: number;
}

const CACH_SAP = {
  /*
   * "Hữu ích nhất" đứng đầu bảng vì nó là cách sắp MẶC ĐỊNH của phần đánh giá,
   * đúng lối App Store. Bài mới nhất chưa ai kịp đọc nên chưa ai bấm hữu ích,
   * vì thế khoá phụ vẫn là ngày: cả kệ toàn bài 0 phiếu thì nó tự quay về
   * "mới nhất", chứ không ra một thứ tự ngẫu nhiên.
   */
  huuIch: [{ soHuuIch: 'desc' as const }, { taoLuc: 'desc' as const }, { id: 'desc' as const }],
  moi: [{ taoLuc: 'desc' as const }, { id: 'desc' as const }],
  cao: [{ sao: 'desc' as const }, { taoLuc: 'desc' as const }, { id: 'desc' as const }],
  thap: [{ sao: 'asc' as const }, { taoLuc: 'desc' as const }, { id: 'desc' as const }],
};

export async function layDanhGia(
  gameId: string,
  loc: { sao?: number | null; sap?: string; trang?: number; ban?: string | null },
): Promise<TrangDanhGia> {
  // Mọi tham số đều do trình duyệt gửi lên, nên ép hết về khoảng cho phép —
  // `trang: 1e9` mà lọt vào `skip` là một lượt quét bảng không đáng có.
  const sao = Number.isInteger(loc.sao) && loc.sao! >= 1 && loc.sao! <= 5 ? loc.sao! : null;
  /*
   * Tra bằng `Object.hasOwn`, không tra thẳng rồi trông vào `??`.
   *
   * `loc.sap` tới từ địa chỉ, nên gõ `?sap=constructor` là tra trúng một khoá
   * CÓ SẴN TRÊN NGUYÊN MẪU của mọi object. Giá trị ấy khác `undefined` nên
   * `??` không đỡ, và một cái hàm đi thẳng vào `orderBy` — Prisma ném lỗi, cả
   * trang đánh giá thành 500. Chỉ cần gõ một chữ trên thanh địa chỉ.
   */
  const maSap = loc.sap ?? 'moi';
  const theo = Object.hasOwn(CACH_SAP, maSap)
    ? CACH_SAP[maSap as keyof typeof CACH_SAP]
    : CACH_SAP.moi;
  const trang = Math.min(200, Math.max(1, Math.floor(Number(loc.trang) || 1)));

  /*
   * LỌC THEO PHIÊN BẢN.
   *
   * Chuỗi số hiệu do trình duyệt gửi lên nên cắt ngắn lại; nó chỉ đi vào một
   * phép so bằng nên không có gì để chèn, nhưng một chuỗi mười nghìn ký tự vẫn
   * là một chuỗi mười nghìn ký tự đi qua đường truyền và vào câu truy vấn.
   */
  const ban = typeof loc.ban === 'string' && loc.ban ? loc.ban.slice(0, 40) : null;

  const where = {
    gameId,
    game: { trangThai: 'DANG_HIEN' as const },
    ...(sao ? { sao } : {}),
    ...(ban ? { soHieu: ban } : {}),
  };

  const [bai, tong] = await Promise.all([
    db.danhGia.findMany({
      where,
      orderBy: theo,
      skip: (trang - 1) * MOI_TRANG_DANH_GIA,
      take: MOI_TRANG_DANH_GIA,
      select: {
        id: true, sao: true, noiDung: true, anh: true, taoLuc: true,
        traLoi: true, traLoiAnh: true, traLoiLuc: true,
        soHieu: true, tieuDe: true, soHuuIch: true, nguoiId: true,
        nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
      },
    }),
    db.danhGia.count({ where }),
  ]);

  /*
   * "Tôi đã bấm chưa" hỏi thành MỘT câu cho cả trang, không hỏi từng bài.
   *
   * Hai mươi bài là hai mươi lượt đi về cơ sở dữ liệu nếu hỏi lẻ, mà câu trả
   * lời gần như luôn là "chưa" — phiếu hữu ích thưa hơn bài đánh giá rất nhiều.
   * Lấy một phát danh sách bài NÀY người ấy đã bấm rồi tra trong bộ nhớ.
   */
  const nguoi = await nguoiHienTai();
  const daBam = nguoi
    ? new Set((await db.danhGiaHuuIch.findMany({
        where: { nguoiId: nguoi.id, danhGiaId: { in: bai.map((b) => b.id) } },
        select: { danhGiaId: true },
      })).map((p) => p.danhGiaId))
    : new Set<string>();

  return { bai: bai.map((b) => ({ ...b, toiDaBam: daBam.has(b.id) })), tong };
}

/**
 * Bấm / bỏ bấm "Hữu ích" cho một bài đánh giá.
 *
 * Một người một phiếu, và phiếu ghi thành hàng riêng chứ không cộng thẳng vào
 * con số: không giữ dấu ai đã bấm thì bấm đi bấm lại là tự đẩy bài mình lên
 * đầu kệ. Xoá trước rồi mới xét `count` — `deleteMany` trả về đã xoá mấy hàng,
 * nên chính nó vừa là phép kiểm "đã bấm chưa" vừa là phép ghi, không có khe hở
 * giữa hai bước cho lượt bấm thứ hai chen vào.
 *
 * Không cho bấm bài của chính mình, và điều kiện ấy nằm trong `where` của câu
 * tìm bài chứ không lọc sau: hàm này là một địa chỉ POST công khai.
 */
export async function bamHuuIch(danhGiaId: string): Promise<KetQua & { dem?: number; daBam?: boolean }> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để bình chọn.' }; }

  const bai = await db.danhGia.findFirst({
    where: {
      id: danhGiaId,
      nguoiId: { not: nguoi.id },
      game: { trangThai: 'DANG_HIEN' },
    },
    select: { id: true, game: { select: { duongDan: true } } },
  });
  if (!bai) return { loi: 'Không bình chọn được bài này.' };

  const kq = await db.$transaction(async (tx) => {
    const bo = await tx.danhGiaHuuIch.deleteMany({
      where: { danhGiaId, nguoiId: nguoi.id },
    });
    if (bo.count > 0) {
      const sau = await tx.danhGia.update({
        where: { id: danhGiaId },
        // Sàn 0: con số đếm sẵn mà âm thì chỉ có thể là do lệch, và một cái
        // "−1 người thấy hữu ích" in ra màn hình thì không cứu được nữa.
        data: { soHuuIch: { decrement: 1 } },
        select: { soHuuIch: true },
      });
      if (sau.soHuuIch < 0) {
        await tx.danhGia.update({ where: { id: danhGiaId }, data: { soHuuIch: 0 }, select: { id: true } });
        return { dem: 0, daBam: false };
      }
      return { dem: sau.soHuuIch, daBam: false };
    }

    await tx.danhGiaHuuIch.create({
      data: { danhGiaId, nguoiId: nguoi.id },
      select: { danhGiaId: true },
    });
    const sau = await tx.danhGia.update({
      where: { id: danhGiaId },
      data: { soHuuIch: { increment: 1 } },
      select: { soHuuIch: true },
    });
    return { dem: sau.soHuuIch, daBam: true };
  });

  revalidatePath(`/game/${bai.game.duongDan}`);
  return { ok: true, ...kq };
}
