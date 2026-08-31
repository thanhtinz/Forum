'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export type ReportTarget = 'thread' | 'reply' | 'comment';
export type ReportState = { ok?: boolean; error?: string };

const FIELD: Record<ReportTarget, 'threadId' | 'replyId' | 'commentId'> = {
  thread: 'threadId', reply: 'replyId', comment: 'commentId',
};

const REASON_MAX = 100;
const DETAIL_MAX = 1000;

/** Tìm tác giả của nội dung bị báo cáo; null nghĩa là nội dung không tồn tại. */
async function authorOf(target: ReportTarget, id: string): Promise<string | null> {
  const sel = { select: { authorId: true } };
  const row = target === 'thread' ? await db.thread.findUnique({ where: { id }, ...sel })
    : target === 'reply' ? await db.reply.findUnique({ where: { id }, ...sel })
    : await db.comment.findUnique({ where: { id }, ...sel });
  return row?.authorId ?? null;
}

export async function createReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Vui lòng đăng nhập để báo cáo.' };
  const userId = session.user.id;

  const target = String(formData.get('target') ?? '') as ReportTarget;
  const targetId = String(formData.get('targetId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim().slice(0, REASON_MAX);
  const detail = String(formData.get('detail') ?? '').trim().slice(0, DETAIL_MAX) || null;

  if (!FIELD[target] || !targetId) return { error: 'Thiếu thông tin đối tượng bị báo cáo.' };
  if (!reason) return { error: 'Vui lòng chọn lý do báo cáo.' };

  // Kiểm tra nội dung có thật trước khi ghi: id bịa sẽ làm khoá ngoại báo lỗi.
  const authorId = await authorOf(target, targetId);
  if (!authorId) return { error: 'Nội dung này không còn tồn tại.' };
  if (authorId === userId) return { error: 'Bạn không thể báo cáo nội dung của chính mình.' };

  const field = FIELD[target];

  // Tránh báo cáo trùng khi vẫn còn đang xử lý
  const dup = await db.report.findFirst({ where: { reporterId: userId, [field]: targetId, status: 'OPEN' }, select: { id: true } });
  if (dup) return { error: 'Bạn đã báo cáo nội dung này rồi. Cảm ơn bạn!' };

  // Trần chung theo NGƯỜI: chỗ chặn trùng ngay trên chỉ tính từng đối tượng
  // một, nên rải báo cáo lên hàng loạt đối tượng khác nhau thì không gì cản.
  const han = await checkRateLimit('report', userId);
  if (!han.allowed) return { error: han.message };

  await db.report.create({ data: { reporterId: userId, [field]: targetId, reason, detail }, select: { id: true } });
  return { ok: true };
}
