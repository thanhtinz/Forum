import { db } from './db';
import {
  SHOUT_TAKE, SHOUT_GAP_SECONDS, SHOUT_PER_MINUTE, SHOUT_HERE_MS, SHOUT_SCOPE,
  type ShoutItem,
} from './shout-const';

export * from './shout-const';

const shoutSelect = {
  id: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  user: { select: { username: true, name: true, image: true, level: true, role: true } },
  replyTo: { select: { id: true, content: true, deletedAt: true, user: { select: { username: true } } } },
} as const;

/**
 * Lấy các câu gần nhất, trả về theo thứ tự cũ → mới để khung chat cuộn xuôi.
 *
 * Câu đã gỡ vẫn trả về nhưng KHÔNG kèm nội dung: chỗ trống hiện "đã bị gỡ"
 * để mạch hội thoại không bị hụt, mà chữ đã gỡ thì không lọt ra ngoài.
 */
export async function getShouts(): Promise<ShoutItem[]> {
  const rows = await db.shoutMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: SHOUT_TAKE,
    select: shoutSelect,
  });

  return rows.reverse().map((r) => ({
    id: r.id,
    content: r.deletedAt ? '' : r.content,
    createdAt: r.createdAt,
    deleted: !!r.deletedAt,
    user: r.user,
    replyTo: r.replyTo
      ? {
          id: r.replyTo.id,
          username: r.replyTo.user?.username ?? null,
          content: r.replyTo.deletedAt ? '' : r.replyTo.content,
        }
      : null,
  }));
}

/** Ai đang mở phòng chat ngay lúc này. */
export async function getShoutHere() {
  const since = new Date(Date.now() - SHOUT_HERE_MS);
  const rows = await db.presenceHere.findMany({
    where: { scope: SHOUT_SCOPE, at: { gte: since } },
    orderBy: { at: 'desc' },
    take: 30,
    select: { user: { select: { username: true, name: true, image: true, level: true } } },
  });
  return rows.map((r) => r.user);
}

/**
 * Ghi nhận người này đang ở một chỗ (phòng chat hoặc một chủ đề).
 * Một hàng cho mỗi (người, chỗ) nên bảng không phình theo lượt xem.
 */
export async function markHere(userId: string, scope: string): Promise<void> {
  await db.presenceHere
    .upsert({
      where: { userId_scope: { userId, scope } },
      create: { userId, scope },
      update: { at: new Date() },
      select: { userId: true },
    })
    .catch(() => {});
}

/** Ai đang xem cùng một chỗ (trừ chính mình nếu muốn). */
export async function getHere(scope: string, windowMs = SHOUT_HERE_MS) {
  const since = new Date(Date.now() - windowMs);
  const rows = await db.presenceHere.findMany({
    where: { scope, at: { gte: since } },
    orderBy: { at: 'desc' },
    take: 20,
    select: { user: { select: { username: true, name: true, level: true } } },
  });
  return rows.map((r) => r.user);
}

/** Ai được gỡ câu này: chính chủ, hoặc điều hành viên/quản trị toàn site. */
export function canRemoveShout(
  me: { id: string; role?: string | null },
  shoutUserId: string,
): boolean {
  return me.id === shoutUserId || me.role === 'ADMIN' || me.role === 'MODERATOR';
}

/** Hạn mức riêng cho phòng chat — thoáng hơn đăng bài nhiều. */
export async function checkShoutRate(userId: string): Promise<string | null> {
  const now = Date.now();
  const [last, recent] = await Promise.all([
    db.shoutMessage.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    db.shoutMessage.count({ where: { userId, createdAt: { gte: new Date(now - 60_000) } } }),
  ]);

  if (last) {
    const gap = Math.floor((now - last.createdAt.getTime()) / 1000);
    if (gap < SHOUT_GAP_SECONDS) return `Chậm thôi, đợi ${SHOUT_GAP_SECONDS - gap} giây nữa.`;
  }
  if (recent >= SHOUT_PER_MINUTE) return `Bạn đã nói ${SHOUT_PER_MINUTE} câu trong một phút. Nghỉ chút đã.`;
  return null;
}
