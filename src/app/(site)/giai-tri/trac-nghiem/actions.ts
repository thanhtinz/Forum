'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { getActiveBan, banMessage } from '@/lib/ban';
import { lockUsers } from '@/lib/lock';
import {
  QUIZ_CHO_DUYET_TOI_DA, QUIZ_SO_PHUONG_AN, loiCauHoi, quyenRaCauHoi,
} from '@/lib/quiz';

const DUONG_DAN = '/giai-tri/trac-nghiem';

/** Kết quả một lượt gửi câu hỏi mới. */
export interface RaCauState {
  ok?: boolean;
  error?: string;
  ke?: string;
}

/** Kết quả một lượt trả lời: đúng/sai, đáp án thật, lời giải, điểm ăn thua. */
export interface TraLoiState {
  error?: string;
  /** Id câu vừa trả lời — để giao diện biết kết quả này là của câu nào. */
  questionId?: string;
  dung?: boolean;
  dapAn?: number;
  giaiThich?: string | null;
  /** Dương là ăn, âm là mất. */
  delta?: number;
  ke?: string;
}

/** Người chơi hợp lệ: đã đăng nhập và không bị cấm. */
async function nguoiChoi() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để chơi.' as const };
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chơi ở khu giải trí') };
  return { userId };
}

// ─────────────────────────── Ra câu hỏi ───────────────────────────

/**
 * Đăng một câu hỏi mới, trừ cọc NGAY.
 *
 * Trừ ngay chứ không đợi duyệt: cọc chính là thứ khiến người ta chịu khó nghĩ
 * câu tử tế. Đợi tới lúc duyệt mới trừ thì thả câu rác chẳng mất gì cả.
 * Câu bị từ chối cũng KHÔNG hoàn cọc, đúng như bản gốc.
 */
export async function dangCauHoi(_prev: RaCauState, formData: FormData): Promise<RaCauState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const noiDung = String(formData.get('noiDung') ?? '').trim();
  const phuongAn = Array.from({ length: QUIZ_SO_PHUONG_AN }, (_, i) =>
    String(formData.get(`phuongAn${i}`) ?? '').trim());
  const dapAn = Number(formData.get('dapAn'));
  const giaiThich = String(formData.get('giaiThich') ?? '').trim();
  const coc = Number(formData.get('coc'));

  const loi = loiCauHoi(noiDung, phuongAn, dapAn, giaiThich, coc);
  if (loi) return { error: loi };

  // Kiểm điều kiện trước để báo lỗi cho tử tế; trần câu chờ duyệt còn được
  // kiểm LẠI trong khoá bên dưới, vì đây là luật đọc-rồi-ghi.
  const quyen = await quyenRaCauHoi(me.userId);
  if (!quyen.duoc) return { error: quyen.vuong! };

  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId);

      const choDuyet = await tx.quizQuestion.count({
        where: { authorId: me.userId, status: 'PENDING' },
      });
      if (choDuyet >= QUIZ_CHO_DUYET_TOI_DA) throw new Error('qua-nhieu');

      const cau = await tx.quizQuestion.create({
        data: {
          authorId: me.userId,
          content: noiDung,
          options: phuongAn,
          correct: dapAn,
          explain: giaiThich || null,
          price: coc,
        },
        select: { id: true },
      });

      // Tạo câu trước rồi mới trừ cọc, chỉ để sổ điểm ghi được `refId` trỏ vào
      // đúng câu nào. Không sợ lọt câu chưa đóng cọc: thiếu điểm là
      // `grantPoints` ném lỗi, cả transaction quay lại, câu vừa tạo mất luôn.
      await grantPoints({
        userId: me.userId, amount: -coc, reason: 'QUIZ_STAKE', refId: cau.id,
        note: 'Đặt cọc ra câu hỏi trắc nghiệm',
      }, tx);
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ ${coc} điểm để đặt cọc câu này.` };
    }
    if (e instanceof Error && e.message === 'qua-nhieu') {
      return { error: `Bạn đang có ${QUIZ_CHO_DUYET_TOI_DA} câu chờ duyệt, chờ duyệt xong đã nhé.` };
    }
    return { error: 'Không gửi được câu hỏi lúc này, thử lại nhé.' };
  }

  revalidatePath(DUONG_DAN);
  return { ok: true, ke: `Đã gửi câu hỏi và trừ ${coc} điểm cọc. Chờ quản trị duyệt là câu sẽ hiện ra.` };
}

// ─────────────────────────── Trả lời ───────────────────────────

/**
 * Trả lời một câu hỏi. Đúng thì ăn cọc của người ra câu, sai thì mất đúng
 * chừng ấy cho người ta.
 *
 * Toàn bộ nằm trong MỘT transaction, và khoá cả hai bên trước khi động vào
 * điểm: chuyển điểm mà không ghi được lượt trả lời (hoặc ngược lại) là hỏng sổ
 * sách, còn hai tab bấm cùng lúc mà không khoá thì trả lời được hai lần.
 */
export async function traLoiCauHoi(_prev: TraLoiState, formData: FormData): Promise<TraLoiState> {
  const me = await nguoiChoi();
  if ('error' in me) return { error: me.error };

  const questionId = String(formData.get('questionId') ?? '').trim();
  const chon = Number(formData.get('chon'));
  if (!Number.isInteger(chon) || chon < 0 || chon >= QUIZ_SO_PHUONG_AN) {
    return { error: 'Hãy chọn một phương án đã nào.' };
  }

  // Đọc trước CHỈ để biết chủ câu là ai — `lockUsers` cần biết khoá những ai
  // trước khi vào việc. Đáp án thì không lấy ở đây.
  const so = await db.quizQuestion.findFirst({
    where: { id: questionId, status: 'APPROVED' },
    select: { authorId: true },
  });
  if (!so) return { error: 'Câu hỏi này không còn mở để trả lời.' };
  if (so.authorId === me.userId) return { error: 'Câu của chính bạn thì trả lời làm gì.' };

  let kq: TraLoiState;
  try {
    kq = await db.$transaction(async (tx) => {
      await lockUsers(tx, me.userId, so.authorId);

      // Đọc lại trong khoá: giữa hai lần đọc, câu có thể vừa bị quản trị gỡ.
      const cau = await tx.quizQuestion.findFirst({
        where: { id: questionId, status: 'APPROVED' },
        select: { id: true, authorId: true, correct: true, explain: true, price: true },
      });
      if (!cau) throw new Error('dong-cua');
      if (cau.authorId === me.userId) throw new Error('cua-minh');

      const dung = chon === cau.correct;

      // Ghi lượt trả lời TRƯỚC khi cộng trừ điểm: ràng buộc duy nhất
      // (questionId, userId) là thứ duy nhất thật sự chặn được trả lời hai lần.
      try {
        await tx.quizAnswer.create({
          data: { questionId: cau.id, userId: me.userId, chosen: chon, correct: dung },
          select: { id: true },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new Error('da-tra-loi');
        }
        throw e;
      }

      let delta = 0;
      if (dung) {
        // Người ra câu trả tiền. Ông ấy có thể đã cháy túi vì mấy người trả lời
        // đúng trước đó — trả được bao nhiêu thì trả bấy nhiêu, chứ chặn người
        // trả lời vì túi người khác rỗng thì oan quá.
        const chu = await tx.user.findUniqueOrThrow({
          where: { id: cau.authorId }, select: { points: true },
        });
        delta = Math.min(cau.price, chu.points);
        if (delta > 0) {
          await grantPoints({
            userId: cau.authorId, amount: -delta, reason: 'QUIZ_WIN', refId: cau.id,
            note: 'Có người trả lời đúng câu hỏi của bạn',
          }, tx);
          await grantPoints({
            userId: me.userId, amount: delta, reason: 'QUIZ_WIN', refId: cau.id,
            note: 'Trả lời đúng câu hỏi trắc nghiệm',
          }, tx);
        }
      } else {
        // Sai thì mình trả. Thiếu điểm là `grantPoints` ném lỗi, cả transaction
        // quay lại — lượt trả lời cũng không được ghi, coi như chưa trả lời.
        await grantPoints({
          userId: me.userId, amount: -cau.price, reason: 'QUIZ_WIN', refId: cau.id,
          note: 'Trả lời sai câu hỏi trắc nghiệm',
        }, tx);
        await grantPoints({
          userId: cau.authorId, amount: cau.price, reason: 'QUIZ_WIN', refId: cau.id,
          note: 'Có người trả lời sai câu hỏi của bạn',
        }, tx);
        delta = -cau.price;
      }

      return {
        questionId: cau.id,
        dung,
        dapAn: cau.correct,
        giaiThich: cau.explain,
        delta,
        ke: dung
          ? delta > 0
            ? `Chính xác! Bạn ăn ${delta} điểm của người ra câu hỏi.`
            : 'Chính xác! Nhưng người ra câu hỏi hết sạch điểm rồi nên chẳng ăn được đồng nào.'
          : `Sai rồi. Bạn mất ${cau.price} điểm cho người ra câu hỏi.`,
      } satisfies TraLoiState;
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: 'Bạn không đủ điểm để nhận câu này — trả lời sai là mất đúng số điểm cọc đấy.' };
    }
    if (e instanceof Error && e.message === 'da-tra-loi') {
      return { error: 'Bạn trả lời câu này rồi, mỗi câu chỉ được một lần thôi.' };
    }
    if (e instanceof Error && e.message === 'dong-cua') {
      return { error: 'Câu hỏi này không còn mở để trả lời.' };
    }
    if (e instanceof Error && e.message === 'cua-minh') {
      return { error: 'Câu của chính bạn thì trả lời làm gì.' };
    }
    return { error: 'Không trả lời được lúc này, thử lại nhé.' };
  }

  // CỐ Ý không `revalidatePath` ở đây: làm mới trang là câu vừa trả lời biến
  // khỏi danh sách ngay lập tức, cuốn theo cả đáp án lẫn lời giải thích vừa
  // hiện ra — người chơi chưa kịp đọc. Cứ để nguyên tới lần tải trang sau.
  return kq;
}
