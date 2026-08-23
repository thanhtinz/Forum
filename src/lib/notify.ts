import type { Prisma, NotificationType } from '@prisma/client';
import { db } from './db';
import { isToggleable } from './notify-types';

export { TOGGLEABLE_TYPES, NOTIFY_LABELS, isToggleable } from './notify-types';
export type { ToggleableType } from './notify-types';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string | null;
  link?: string | null;
  actorId?: string | null;
}

/**
 * Lọc ra những người còn muốn nhận loại thông báo này.
 *
 * Dùng khi báo cho nhiều người cùng lúc (người theo dõi chủ đề) — một truy vấn
 * cho cả danh sách thay vì mỗi người một lần đọc như `notify` tự làm.
 */
export async function filterNotifiable(userIds: string[], type: NotificationType): Promise<string[]> {
  if (userIds.length === 0 || !isToggleable(type)) return userIds;
  const rows = await db.user.findMany({
    where: { id: { in: userIds }, NOT: { notifyOff: { has: type } } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Tạo một thông báo cho người dùng. Có thể gộp vào transaction lớn hơn.
 * Trả về null nếu người nhận đã tắt loại thông báo này.
 */
export async function notify(input: NotifyInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? db;

  if (isToggleable(input.type)) {
    const target = await client.user.findUnique({
      where: { id: input.userId },
      select: { notifyOff: true },
    });
    if (!target || target.notifyOff.includes(input.type)) return null;
  }

  return client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content ?? null,
      link: input.link ?? null,
      actorId: input.actorId ?? null,
    },
  });
}
