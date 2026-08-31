import { db } from './db';
import { cosmeticSelect, toCosmetics } from './shop';
import {
  canRemoveEntry, isStaff, GUESTBOOK_PAGE_SIZE, GUESTBOOK_GAP_SECONDS, GUESTBOOK_PER_DAY,
  type GuestbookItem, type Viewer,
} from './guestbook-const';
import { tinhSoTrang } from '@/lib/utils';

export * from './guestbook-const';

const entrySelect = {
  id: true,
  content: true,
  reply: true,
  repliedAt: true,
  private: true,
  hiddenAt: true,
  createdAt: true,
  authorId: true,
  author: { select: { id: true, username: true, name: true, image: true, level: true, role: true, ...cosmeticSelect } },
} as const;

/**
 * Lấy một trang sổ lưu bút.
 *
 * Lời nhắn kín và lời đã gỡ được lọc NGAY TRONG câu truy vấn chứ không lọc sau
 * khi lấy về: dựng ra rồi mới bỏ đi thì nội dung vẫn kịp đi xuống trình duyệt
 * trong gói dữ liệu của trang.
 */
export async function getGuestbook(
  ownerId: string,
  viewer: Viewer,
  page = 1,
): Promise<{ items: GuestbookItem[]; total: number; totalPages: number }> {
  const staff = isStaff(viewer);
  const owner = viewer.id === ownerId;

  // Lời kín: chỉ chủ nhà, người viết và ban điều hành đọc được.
  const privacy = staff || owner
    ? {}
    : viewer.id
      ? { OR: [{ private: false }, { authorId: viewer.id }] }
      : { private: false };
  // Lời đã gỡ: chỉ ban điều hành còn thấy, để còn xử lý người viết.
  const visibility = staff ? {} : { hiddenAt: null };

  const where = { ownerId, ...privacy, ...visibility };

  const [total, rows] = await Promise.all([
    db.guestbookEntry.count({ where }),
    db.guestbookEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * GUESTBOOK_PAGE_SIZE,
      take: GUESTBOOK_PAGE_SIZE,
      select: entrySelect,
    }),
  ]);

  return {
    total,
    totalPages: tinhSoTrang(total, GUESTBOOK_PAGE_SIZE),
    items: rows.map((r) => ({
      id: r.id,
      content: r.content,
      reply: r.reply,
      repliedAt: r.repliedAt,
      private: r.private,
      hidden: !!r.hiddenAt,
      createdAt: r.createdAt,
      author: { ...r.author, cosmetics: toCosmetics(r.author) },
      canRemove: canRemoveEntry(viewer, ownerId, r.authorId),
    })),
  };
}

/** Hạn mức ghi sổ — chống việc rải lời nhắn hàng loạt khắp các hồ sơ. */
export async function checkGuestbookRate(authorId: string, ownerId: string): Promise<string | null> {
  const now = Date.now();
  const [last, today] = await Promise.all([
    db.guestbookEntry.findFirst({ where: { authorId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    db.guestbookEntry.count({
      where: { authorId, ownerId, createdAt: { gte: new Date(now - 86_400_000) } },
    }),
  ]);

  if (last) {
    const gap = Math.floor((now - last.createdAt.getTime()) / 1000);
    if (gap < GUESTBOOK_GAP_SECONDS) return `Chậm thôi, đợi ${GUESTBOOK_GAP_SECONDS - gap} giây nữa.`;
  }
  if (today >= GUESTBOOK_PER_DAY) {
    return `Bạn đã ghi ${GUESTBOOK_PER_DAY} lời nhắn cho người này hôm nay rồi.`;
  }
  return null;
}
