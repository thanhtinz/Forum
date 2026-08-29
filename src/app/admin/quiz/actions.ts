'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { logAdmin } from '@/lib/audit';
import { notify } from '@/lib/notify';

export interface DuyetState { ok?: boolean; error?: string }

/**
 * Duyệt hoặc từ chối một câu hỏi trắc nghiệm.
 *
 * Chỉ đổi được trạng thái của câu ĐANG CHỜ: dùng `updateMany` có điều kiện
 * `status: 'PENDING'` chứ không đọc rồi mới ghi — hai quản trị viên mở cùng
 * một hàng chờ là chuyện thường, người bấm sau phải biết mình bấm hụt.
 *
 * KHÔNG hoàn cọc khi từ chối: cọc trừ ngay lúc đăng chính là thứ khiến người
 * ta không thả câu rác. Hoàn lại là mất sạch tác dụng.
 */
async function xetDuyet(id: string, duyet: boolean, ghiChu: string): Promise<DuyetState> {
  const admin = await assertAdmin();

  const cau = await db.quizQuestion.findUnique({
    where: { id },
    select: { id: true, authorId: true, content: true, status: true },
  });
  if (!cau) return { error: 'Không tìm thấy câu hỏi.' };

  const res = await db.quizQuestion.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: duyet ? 'APPROVED' : 'REJECTED',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: duyet ? null : (ghiChu.slice(0, 300) || null),
    },
  });
  if (res.count === 0) return { error: 'Câu này đã được người khác xét duyệt rồi.' };

  await notify({
    userId: cau.authorId,
    type: 'SYSTEM',
    title: duyet ? 'Câu hỏi trắc nghiệm đã được duyệt' : 'Câu hỏi trắc nghiệm bị từ chối',
    content: duyet
      ? cau.content.slice(0, 120)
      : `${cau.content.slice(0, 100)}${ghiChu ? ` — ${ghiChu.slice(0, 150)}` : ''}`,
    link: '/giai-tri/trac-nghiem',
  });

  await logAdmin({
    actor: admin,
    action: duyet ? 'quiz.approve' : 'quiz.reject',
    targetType: 'quiz',
    targetId: id,
    summary: `${duyet ? 'Duyệt' : 'Từ chối'} câu hỏi trắc nghiệm: ${cau.content.slice(0, 80)}`,
    meta: ghiChu ? { note: ghiChu } : undefined,
  });

  revalidatePath('/admin/quiz');
  revalidatePath('/giai-tri/trac-nghiem');
  return { ok: true };
}

/** Duyệt câu hỏi — từ lúc này người khác trả lời được. */
export async function duyetCauHoi(id: string): Promise<DuyetState> {
  return xetDuyet(id, true, '');
}

/** Từ chối câu hỏi, kèm lý do để người đăng biết đường sửa lần sau. */
export async function tuChoiCauHoi(id: string, ghiChu: string): Promise<DuyetState> {
  return xetDuyet(id, false, String(ghiChu ?? '').trim());
}
