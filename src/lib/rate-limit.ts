import { db } from './db';

/**
 * Hạn mức chống spam, đếm ngay trên dữ liệu thật nên không cần Redis
 * và vẫn đúng khi chạy nhiều tiến trình.
 */
export const RATE_LIMITS = {
  thread: { max: 5, windowMinutes: 60, label: 'chủ đề' },
  reply: { max: 20, windowMinutes: 60, label: 'trả lời' },
  comment: { max: 20, windowMinutes: 60, label: 'bình luận' },
} as const;

export type RateKind = keyof typeof RATE_LIMITS;

/** Khoảng thời gian tối thiểu giữa hai lần đăng liên tiếp (chống bấm liên hồi). */
const MIN_GAP_SECONDS = 20;

export interface RateResult {
  allowed: boolean;
  message?: string;
}

function tooFastMessage(kind: RateKind, seconds: number): string {
  return `Bạn đăng ${RATE_LIMITS[kind].label} quá nhanh, vui lòng đợi ${seconds} giây.`;
}

/**
 * Kiểm tra hạn mức cho một hành động đăng nội dung.
 * Trả về `allowed: false` kèm thông báo tiếng Việt để hiển thị thẳng cho người dùng.
 */
export async function checkRateLimit(kind: RateKind, userId: string): Promise<RateResult> {
  const { max, windowMinutes, label } = RATE_LIMITS[kind];
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [count, last] = await Promise.all([
    countSince(kind, userId, since),
    lastCreatedAt(kind, userId),
  ]);

  if (last) {
    const gap = Math.floor((Date.now() - last.getTime()) / 1000);
    if (gap < MIN_GAP_SECONDS) return { allowed: false, message: tooFastMessage(kind, MIN_GAP_SECONDS - gap) };
  }

  if (count >= max) {
    return { allowed: false, message: `Bạn đã đăng ${max} ${label} trong ${windowMinutes} phút qua. Hãy nghỉ một lát rồi quay lại.` };
  }
  return { allowed: true };
}

function countSince(kind: RateKind, userId: string, since: Date): Promise<number> {
  const where = { authorId: userId, createdAt: { gte: since } };
  switch (kind) {
    case 'thread': return db.thread.count({ where });
    case 'reply': return db.reply.count({ where });
    case 'comment': return db.comment.count({ where });
  }
}

async function lastCreatedAt(kind: RateKind, userId: string): Promise<Date | null> {
  const args = { where: { authorId: userId }, orderBy: { createdAt: 'desc' as const }, select: { createdAt: true } };
  const row = kind === 'thread' ? await db.thread.findFirst(args)
    : kind === 'reply' ? await db.reply.findFirst(args)
    : await db.comment.findFirst(args);
  return row?.createdAt ?? null;
}
