import { db } from './db';

/** Lời nhắn kèm khi xin kết bạn. */
export const FRIEND_MESSAGE_MAX = 200;
/** Số lời mời đang chờ tối đa một người được giữ — chống rải lời mời hàng loạt. */
export const FRIEND_PENDING_MAX = 30;

/**
 * Quan hệ giữa người đang xem và một người khác, nhìn từ phía người xem.
 *
 * `incoming` là "họ mời mình, mình chưa bấm"; `outgoing` là "mình đã mời, đang
 * chờ họ". Hai cái này khác hẳn nhau ở nút bấm nên không gộp thành một trạng
 * thái "đang chờ" chung được.
 */
export type FriendState = 'none' | 'friends' | 'incoming' | 'outgoing' | 'self';

/** Một hàng Friendship nhìn từ phía người xem. */
export interface FriendRow {
  id: string;
  message: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  user: { id: string; username: string | null; name: string | null; image: string | null; level: number; role: string };
}

/** Số dòng mỗi trang của cả ba danh sách trên trang bạn bè. */
export const FRIEND_PAGE_SIZE = 20;

export interface FriendPage {
  items: FriendRow[];
  total: number;
  totalPages: number;
}

const page_ = (items: FriendRow[], total: number): FriendPage => ({
  items, total, totalPages: Math.ceil(total / FRIEND_PAGE_SIZE),
});

const userSelect = {
  id: true, username: true, name: true, image: true, level: true, role: true,
} as const;

/** Tìm hàng nối hai người, bất kể ai là người gửi. */
export async function findFriendship(a: string, b: string) {
  return db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true, requesterId: true, addresseeId: true, status: true },
  });
}

/** Quan hệ với một người, nhìn từ phía `viewerId`. */
export async function getFriendState(viewerId: string | null, targetId: string): Promise<FriendState> {
  if (!viewerId) return 'none';
  if (viewerId === targetId) return 'self';

  const row = await findFriendship(viewerId, targetId);
  if (!row) return 'none';
  if (row.status === 'ACCEPTED') return 'friends';
  return row.requesterId === viewerId ? 'outgoing' : 'incoming';
}

/** Đếm bạn bè của một người. */
export async function countFriends(userId: string): Promise<number> {
  return db.friendship.count({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/**
 * Danh sách bạn bè.
 *
 * Bạn bè nằm ở cả hai cột nên phải lấy cả hai chiều rồi mới chọn ra "người
 * kia" của từng hàng — không có cách nào viết thành một cột duy nhất mà vẫn
 * giữ được thông tin ai là người gửi lời mời.
 */
export async function getFriends(userId: string, page = 1): Promise<FriendPage> {
  const where = {
    status: 'ACCEPTED' as const,
    OR: [{ requesterId: userId }, { addresseeId: userId }],
  };
  const [total, rows] = await Promise.all([
    db.friendship.count({ where }),
    db.friendship.findMany({
      where,
      orderBy: { acceptedAt: 'desc' },
      skip: (Math.max(1, page) - 1) * FRIEND_PAGE_SIZE,
      take: FRIEND_PAGE_SIZE,
      select: {
        id: true, message: true, createdAt: true, acceptedAt: true, requesterId: true,
        requester: { select: userSelect },
        addressee: { select: userSelect },
      },
    }),
  ]);

  return page_(rows.map((r) => ({
    id: r.id,
    message: r.message,
    createdAt: r.createdAt,
    acceptedAt: r.acceptedAt,
    user: r.requesterId === userId ? r.addressee : r.requester,
  })), total);
}

/** Lời mời người khác gửi cho mình, đang chờ mình bấm. */
export async function getIncomingRequests(userId: string, page = 1): Promise<FriendPage> {
  const where = { addresseeId: userId, status: 'PENDING' as const };
  const [total, rows] = await Promise.all([
    db.friendship.count({ where }),
    db.friendship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * FRIEND_PAGE_SIZE,
      take: FRIEND_PAGE_SIZE,
      select: { id: true, message: true, createdAt: true, acceptedAt: true, requester: { select: userSelect } },
    }),
  ]);
  return page_(rows.map((r) => ({ ...r, user: r.requester })), total);
}

/** Lời mời mình đã gửi, đang chờ người kia. */
export async function getOutgoingRequests(userId: string, page = 1): Promise<FriendPage> {
  const where = { requesterId: userId, status: 'PENDING' as const };
  const [total, rows] = await Promise.all([
    db.friendship.count({ where }),
    db.friendship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * FRIEND_PAGE_SIZE,
      take: FRIEND_PAGE_SIZE,
      select: { id: true, message: true, createdAt: true, acceptedAt: true, addressee: { select: userSelect } },
    }),
  ]);
  return page_(rows.map((r) => ({ ...r, user: r.addressee })), total);
}

/** Có phải bạn bè không — dùng cho những chỗ sau này giới hạn "chỉ bạn bè". */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const row = await findFriendship(a, b);
  return row?.status === 'ACCEPTED';
}
