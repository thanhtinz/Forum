import type { Prisma } from '@prisma/client';
import { db } from './db';
import { authorChipSelect, toAuthorChip, type AuthorChip } from './shop';

/**
 * Danh bạ thành viên.
 *
 * Bảng xếp hạng chỉ khoe vài chục người đứng đầu; muốn tìm một người cụ thể,
 * hoặc xem ai mới vào, thì trước đây không có chỗ nào ngoài ô tìm kiếm chung.
 */

/** Bao lâu không thấy hoạt động thì coi là đã rời đi. Bằng với ô "đang online". */
export const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export const MEMBERS_PER_PAGE = 24;

export const MEMBER_SORTS = [
  { key: 'active', label: 'Hoạt động gần đây' },
  { key: 'new', label: 'Mới tham gia' },
  { key: 'level', label: 'Cấp cao nhất' },
  { key: 'points', label: 'Nhiều điểm nhất' },
  { key: 'karma', label: 'Uy tín cao nhất' },
  { key: 'threads', label: 'Nhiều chủ đề nhất' },
] as const;

export type MemberSort = (typeof MEMBER_SORTS)[number]['key'];

export function isMemberSort(v: string | undefined): v is MemberSort {
  return MEMBER_SORTS.some((s) => s.key === v);
}

const ORDER_BY: Record<MemberSort, Prisma.UserOrderByWithRelationInput[]> = {
  // `lastSeenAt` rỗng ở người chưa vào lần nào từ khi có cột này, nên xếp
  // xuống cuối thay vì lên đầu.
  active: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
  new: [{ createdAt: 'desc' }],
  level: [{ exp: 'desc' }],
  points: [{ points: 'desc' }],
  karma: [{ karma: 'desc' }],
  threads: [{ threads: { _count: 'desc' } }],
};

export interface MemberRow {
  id: string;
  chip: AuthorChip | null;
  karma: number;
  points: number;
  createdAt: Date;
  lastSeenAt: Date | null;
  online: boolean;
  threads: number;
  replies: number;
  mood: string | null;
}

/**
 * Một trang danh bạ.
 *
 * Chỉ đếm và lấy đúng một trang; số thành viên chỉ có tăng nên không bao giờ
 * lấy hết về rồi cắt ở tầng ứng dụng.
 */
export async function getMembers(opts: { page?: number; q?: string; sort?: MemberSort; onlineOnly?: boolean } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const sort: MemberSort = opts.sort ?? 'active';
  const q = opts.q?.trim();
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  const where: Prisma.UserWhereInput = {
    status: 'ACTIVE',
    ...(opts.onlineOnly ? { lastSeenAt: { gte: since } } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, online, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.count({ where: { status: 'ACTIVE', lastSeenAt: { gte: since } } }),
    db.user.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * MEMBERS_PER_PAGE,
      take: MEMBERS_PER_PAGE,
      select: {
        id: true, karma: true, points: true, createdAt: true, lastSeenAt: true, mood: true,
        _count: { select: { threads: true, replies: true } },
        ...authorChipSelect,
      },
    }),
  ]);

  const items: MemberRow[] = rows.map((u) => ({
    id: u.id,
    chip: toAuthorChip(u),
    karma: u.karma,
    points: u.points,
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt,
    online: !!u.lastSeenAt && u.lastSeenAt >= since,
    threads: u._count.threads,
    replies: u._count.replies,
    mood: u.mood,
  }));

  return {
    items,
    page,
    totalPages: Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE)),
    total,
    online,
  };
}
