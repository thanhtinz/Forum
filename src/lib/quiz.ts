import { db } from './db';
import { authorChipSelect, toAuthorChip, type AuthorChip } from './shop';
import {
  QUIZ_BAI_TOI_THIEU, QUIZ_BINH_LUAN_MOI_TRANG, QUIZ_CHO_DUYET_TOI_DA,
  QUIZ_MOI_TRANG, QUIZ_NGUOI_TRA_LOI_TOI_DA, QUIZ_THE_LOAI_TOI_DA,
} from './quiz-const';

export * from './quiz-const';

/**
 * Truy vấn cho trò Trắc nghiệm.
 *
 * Quy tắc xuyên suốt tệp này: cột `correct` (và `explain`, vì lời giải nói
 * toạc ra đáp án) KHÔNG BAO GIỜ nằm trong `select` của truy vấn phục vụ người
 * chưa trả lời. Lấy về rồi ẩn bằng giao diện là vô nghĩa — dữ liệu server
 * component đi thẳng vào mã nguồn trang, bấm xem nguồn là thấy đáp án. Nên
 * đáp án được lấy ở MỘT truy vấn riêng, chỉ chạy khi người xem đã có quyền
 * thấy nó.
 */

/** Số bài trên diễn đàn: chủ đề đang hiện + trả lời chưa bị ẩn. */
export async function soBaiDienDan(userId: string): Promise<number> {
  const [thread, reply] = await Promise.all([
    db.thread.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
    db.reply.count({ where: { authorId: userId, hidden: false } }),
  ]);
  return thread + reply;
}

export interface QuyenRaCau {
  duoc: boolean;
  soBai: number;
  choDuyet: number;
  /** Lý do chưa được ra câu hỏi, `null` nếu được. */
  vuong: string | null;
}

/** Người này có được ra câu hỏi lúc này không, và vì sao không. */
export async function quyenRaCauHoi(userId: string): Promise<QuyenRaCau> {
  const [soBai, choDuyet] = await Promise.all([
    soBaiDienDan(userId),
    db.quizQuestion.count({ where: { authorId: userId, status: 'PENDING' } }),
  ]);
  const vuong = soBai < QUIZ_BAI_TOI_THIEU
    ? `Cần ít nhất ${QUIZ_BAI_TOI_THIEU} bài trên diễn đàn mới được ra câu hỏi (bạn đang có ${soBai}).`
    : choDuyet >= QUIZ_CHO_DUYET_TOI_DA
      ? `Bạn đang có ${choDuyet} câu chờ duyệt, chờ duyệt xong rồi ra câu tiếp nhé.`
      : null;
  return { duoc: vuong === null, soBai, choDuyet, vuong };
}

// ─────────────────────────── Thể loại ───────────────────────────

export interface TheLoaiTom {
  id: string;
  slug: string;
  name: string;
  note: string | null;
  /** Số câu ĐÃ DUYỆT trong thể loại — con số bản gốc in trong ngoặc. */
  soCau: number;
}

/**
 * Cả bảng thể loại kèm số câu đã duyệt của từng thể loại.
 *
 * Đếm bằng MỘT `groupBy` cho cả bảng chứ không đếm từng thể loại một: bản gốc
 * chạy đúng một câu `COUNT(*)` trong vòng lặp, mười thể loại là mười lượt hỏi
 * cơ sở dữ liệu.
 */
export async function danhSachTheLoai(): Promise<TheLoaiTom[]> {
  const rows = await db.quizCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    take: QUIZ_THE_LOAI_TOI_DA,
    select: { id: true, slug: true, name: true, note: true },
  });
  if (rows.length === 0) return [];

  const dem = await db.quizQuestion.groupBy({
    by: ['categoryId'],
    where: { status: 'APPROVED', categoryId: { in: rows.map((r) => r.id) } },
    _count: { _all: true },
  });
  const bang = new Map(dem.map((d) => [d.categoryId, d._count._all]));

  return rows.map((r) => ({ ...r, soCau: bang.get(r.id) ?? 0 }));
}

/** Một thể loại theo địa chỉ, `null` nếu không có. */
export async function theLoaiTheoSlug(slug: string) {
  return db.quizCategory.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, note: true },
  });
}

// ─────────────────────────── Danh sách câu hỏi ───────────────────────────

/** Một dòng trong danh sách câu hỏi — KHÔNG kèm đáp án. */
export interface CauHoiDong {
  id: string;
  content: string;
  price: number;
  createdAt: Date;
  soLuot: number;
  category: { slug: string; name: string } | null;
}

/**
 * Danh sách câu hỏi ĐÃ DUYỆT, mới nhất trước — dùng cho cả trang chủ trắc
 * nghiệm lẫn trang từng thể loại. Bản gốc dùng chung một khối mã cho hai chỗ
 * ấy, chỉ khác đúng điều kiện `refid`.
 */
export async function danhSachCauHoi(
  { categoryId, trang = 1 }: { categoryId?: string; trang?: number } = {},
): Promise<{ items: CauHoiDong[]; tong: number }> {
  const where = { status: 'APPROVED' as const, ...(categoryId ? { categoryId } : {}) };
  const [tong, rows] = await Promise.all([
    db.quizQuestion.count({ where }),
    db.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (trang - 1) * QUIZ_MOI_TRANG,
      take: QUIZ_MOI_TRANG,
      select: {
        id: true, content: true, price: true, createdAt: true,
        category: { select: { slug: true, name: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);
  return {
    tong,
    items: rows.map((r) => ({
      id: r.id,
      content: r.content,
      price: r.price,
      createdAt: r.createdAt,
      category: r.category,
      soLuot: r._count.answers,
    })),
  };
}

/**
 * "Câu hỏi của bạn" — câu mình đã đăng, đủ mọi trạng thái duyệt, kèm số lượt
 * trả lời đúng/sai. Chỗ này được thấy đáp án, vì mình ra câu mà.
 */
export async function cauHoiCuaToi(userId: string, trang = 1) {
  const where = { authorId: userId };
  const [tong, rows] = await Promise.all([
    db.quizQuestion.count({ where }),
    db.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (trang - 1) * QUIZ_MOI_TRANG,
      take: QUIZ_MOI_TRANG,
      select: {
        id: true, content: true, options: true, correct: true, explain: true,
        price: true, status: true, reviewNote: true, createdAt: true,
        category: { select: { slug: true, name: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);

  // Số lượt trả lời ĐÚNG của từng câu — mỗi lượt đúng là một lần mình mất cọc.
  // Gom một truy vấn cho cả trang, chứ đếm từng câu là N+1.
  const dung = rows.length === 0 ? [] : await db.quizAnswer.groupBy({
    by: ['questionId'],
    where: { questionId: { in: rows.map((r) => r.id) }, correct: true },
    _count: { _all: true },
  });
  const bangDung = new Map(dung.map((d) => [d.questionId, d._count._all]));

  return {
    tong,
    items: rows.map((r) => {
      const soDung = bangDung.get(r.id) ?? 0;
      return { ...r, soLuot: r._count.answers, soDung, soSai: r._count.answers - soDung };
    }),
  };
}

// ─────────────────────────── Một câu hỏi ───────────────────────────

/** Lượt trả lời của chính người đang xem. */
export interface LuotCuaToi {
  chosen: number;
  correct: boolean;
  createdAt: Date;
}

export interface CauHoiChiTiet {
  id: string;
  content: string;
  options: string[];
  price: number;
  createdAt: Date;
  authorId: string;
  author: AuthorChip | null;
  reviewedBy: AuthorChip | null;
  category: { slug: string; name: string } | null;
  soLuot: number;
  soDung: number;
  soSai: number;
  /** Lượt trả lời của người đang xem, `null` nếu chưa trả lời. */
  luot: LuotCuaToi | null;
  /**
   * Đáp án và lời giải. `null` khi người xem CHƯA có quyền thấy — và khi ấy
   * hai cột đó chưa hề rời khỏi cơ sở dữ liệu, chứ không phải lấy về rồi giấu.
   */
  loGiai: { correct: number; explain: string | null } | null;
}

/**
 * Một câu hỏi để trả lời.
 *
 * Đáp án chỉ được truy vấn khi người xem đã trả lời rồi, là người ra câu, hoặc
 * là quản trị. Ba trường hợp ấy đằng nào cũng phải thấy đáp án; còn lại thì
 * câu truy vấn thứ hai không chạy.
 */
export async function cauHoiChiTiet(
  id: string,
  viewerId: string | null,
  laQuanTri = false,
): Promise<CauHoiChiTiet | null> {
  const cau = await db.quizQuestion.findFirst({
    where: { id, status: 'APPROVED' },
    select: {
      id: true, content: true, options: true, price: true, createdAt: true,
      authorId: true,
      author: { select: authorChipSelect },
      reviewedBy: { select: authorChipSelect },
      category: { select: { slug: true, name: true } },
    },
  });
  if (!cau) return null;

  const [luot, demTheoKetQua] = await Promise.all([
    viewerId
      ? db.quizAnswer.findUnique({
        where: { questionId_userId: { questionId: id, userId: viewerId } },
        select: { chosen: true, correct: true, createdAt: true },
      })
      : Promise.resolve(null),
    db.quizAnswer.groupBy({
      by: ['correct'],
      where: { questionId: id },
      _count: { _all: true },
    }),
  ]);

  const soDung = demTheoKetQua.find((d) => d.correct)?._count._all ?? 0;
  const soSai = demTheoKetQua.find((d) => !d.correct)?._count._all ?? 0;

  const duocThay = laQuanTri || luot !== null || cau.authorId === viewerId;
  const loGiai = duocThay
    ? await db.quizQuestion.findUnique({
      where: { id },
      select: { correct: true, explain: true },
    })
    : null;

  return {
    id: cau.id,
    content: cau.content,
    options: cau.options,
    price: cau.price,
    createdAt: cau.createdAt,
    authorId: cau.authorId,
    author: toAuthorChip(cau.author),
    reviewedBy: toAuthorChip(cau.reviewedBy),
    category: cau.category,
    soLuot: soDung + soSai,
    soDung,
    soSai,
    luot,
    loGiai,
  };
}

/**
 * Tên những người đã trả lời câu này, chia hai phía đúng và sai.
 *
 * Bản gốc kể ra hết, không giới hạn — câu nào đông người trả lời là ra một
 * đoạn dài dằng dặc. Ở đây chặn trần và để phần đếm nói tiếp phần còn lại.
 */
export async function nguoiDaTraLoi(questionId: string) {
  const rows = await db.quizAnswer.findMany({
    where: { questionId },
    orderBy: { createdAt: 'desc' },
    take: QUIZ_NGUOI_TRA_LOI_TOI_DA,
    select: { id: true, correct: true, user: { select: authorChipSelect } },
  });
  return {
    dung: rows.filter((r) => r.correct).map((r) => ({ id: r.id, chip: toAuthorChip(r.user) })),
    sai: rows.filter((r) => !r.correct).map((r) => ({ id: r.id, chip: toAuthorChip(r.user) })),
  };
}

// ─────────────────────────── Bình luận ───────────────────────────

export interface BinhLuanView {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date;
  authorId: string;
  author: AuthorChip | null;
}

/**
 * Bình luận dưới một câu hỏi.
 *
 * Bình luận bị ẩn KHÔNG bị lọc bằng giao diện: người thường thì điều kiện
 * `hidden: false` nằm ngay trong truy vấn, nội dung ấy không rời khỏi máy chủ.
 * Điều hành viên mới lấy cả phần đã ẩn, vì họ cần đọc để còn phục hồi.
 */
export async function binhLuanCuaCau(
  questionId: string,
  { trang = 1, xemDuocPhanAn = false }: { trang?: number; xemDuocPhanAn?: boolean } = {},
): Promise<{ items: BinhLuanView[]; tong: number }> {
  const where = { questionId, ...(xemDuocPhanAn ? {} : { hidden: false }) };
  const [tong, rows] = await Promise.all([
    db.quizComment.count({ where }),
    db.quizComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (trang - 1) * QUIZ_BINH_LUAN_MOI_TRANG,
      take: QUIZ_BINH_LUAN_MOI_TRANG,
      select: {
        id: true, content: true, hidden: true, createdAt: true, authorId: true,
        author: { select: authorChipSelect },
      },
    }),
  ]);
  return { tong, items: rows.map((r) => ({ ...r, author: toAuthorChip(r.author) })) };
}
