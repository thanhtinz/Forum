'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export type ReportTarget = 'post' | 'thread' | 'reply' | 'comment';
export type ReportState = { ok?: boolean; error?: string };

const FIELD: Record<ReportTarget, 'postId' | 'threadId' | 'replyId' | 'commentId'> = {
  post: 'postId', thread: 'threadId', reply: 'replyId', comment: 'commentId',
};

export async function createReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Vui lòng đăng nhập để báo cáo.' };
  const userId = session.user.id;

  const target = String(formData.get('target') ?? '') as ReportTarget;
  const targetId = String(formData.get('targetId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const detail = String(formData.get('detail') ?? '').trim() || null;

  if (!FIELD[target] || !targetId) return { error: 'Thiếu thông tin đối tượng bị báo cáo.' };
  if (!reason) return { error: 'Vui lòng chọn lý do báo cáo.' };

  const field = FIELD[target];

  // Tránh báo cáo trùng khi vẫn còn đang xử lý
  const dup = await db.report.findFirst({ where: { reporterId: userId, [field]: targetId, status: 'OPEN' }, select: { id: true } });
  if (dup) return { error: 'Bạn đã báo cáo nội dung này rồi. Cảm ơn bạn!' };

  await db.report.create({ data: { reporterId: userId, [field]: targetId, reason, detail } });
  return { ok: true };
}
