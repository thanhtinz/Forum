import type { Prisma, NotificationType } from '@prisma/client';
import { db } from './db';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string | null;
  link?: string | null;
  actorId?: string | null;
}

/** Tạo một thông báo cho người dùng. Có thể gộp vào transaction lớn hơn. */
export async function notify(input: NotifyInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? db;
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
