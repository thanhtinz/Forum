import { db } from './db';
import { QUIZ_BAI_TOI_THIEU, QUIZ_CHO_DUYET_TOI_DA, QUIZ_MOI_TRANG } from './quiz-const';

export * from './quiz-const';

/**
 * Truy vấn cho trò Trắc nghiệm.
 *
 * Quy tắc xuyên suốt tệp này: cột `correct` KHÔNG BAO GIỜ nằm trong `select`
 * của truy vấn phục vụ người đang đi trả lời. Lấy về rồi ẩn bằng giao diện là
 * vô nghĩa — dữ liệu server component đi thẳng vào mã nguồn trang, bấm xem
 * nguồn là thấy đáp án.
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

/** Một câu hỏi bày ra cho người khác trả lời — KHÔNG kèm đáp án. */
export interface CauHoiMo {
  id: string;
  content: string;
  options: string[];
  price: number;
  createdAt: Date;
  author: { name: string | null; username: string | null; image: string | null };
  soLuot: number;
}

/**
 * Những câu người này còn trả lời được: đã duyệt, không phải câu của chính
 * mình, và mình chưa trả lời lần nào.
 */
export async function cauHoiConTraLoi(
  userId: string,
  trang = 1,
): Promise<{ items: CauHoiMo[]; tong: number }> {
  const where = {
    status: 'APPROVED' as const,
    authorId: { not: userId },
    answers: { none: { userId } },
  };
  const [tong, rows] = await Promise.all([
    db.quizQuestion.count({ where }),
    db.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (trang - 1) * QUIZ_MOI_TRANG,
      take: QUIZ_MOI_TRANG,
      select: {
        id: true, content: true, options: true, price: true, createdAt: true,
        author: { select: { name: true, username: true, image: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);
  return {
    tong,
    items: rows.map((r) => ({
      id: r.id,
      content: r.content,
      options: r.options,
      price: r.price,
      createdAt: r.createdAt,
      author: r.author,
      soLuot: r._count.answers,
    })),
  };
}

/** Câu hỏi của chính mình — chỗ này được thấy đáp án, vì mình ra câu mà. */
export async function cauHoiCuaToi(userId: string, take = QUIZ_MOI_TRANG) {
  const rows = await db.quizQuestion.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, content: true, options: true, correct: true, explain: true,
      price: true, status: true, reviewNote: true, createdAt: true,
      _count: { select: { answers: true } },
    },
  });

  // Số lượt trả lời ĐÚNG của từng câu — mỗi lượt đúng là một lần mình mất cọc.
  // Gom một truy vấn cho cả trang, chứ đếm từng câu là N+1.
  const dung = rows.length === 0 ? [] : await db.quizAnswer.groupBy({
    by: ['questionId'],
    where: { questionId: { in: rows.map((r) => r.id) }, correct: true },
    _count: { _all: true },
  });
  const bangDung = new Map(dung.map((d) => [d.questionId, d._count._all]));

  return rows.map((r) => ({ ...r, soLuot: r._count.answers, soDung: bangDung.get(r.id) ?? 0 }));
}
