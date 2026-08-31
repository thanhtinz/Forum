import type { Role } from '@prisma/client';
import { db } from './db';
import { ONLINE_WINDOW_MS } from './members';
import { authorChipSelect, toAuthorChip, type AuthorChip } from './shop';

/**
 * "Ai đang online" — trang mà forum wap nào cũng có, kể cả chỗ người ta đang
 * đứng.
 *
 * Hai nguồn khác nhau, đừng lẫn:
 *   • `User.lastSeenAt` trả lời AI đang online — ghi ở mọi trang, cửa sổ 15
 *     phút, giống hệt chấm xanh cạnh nick ở khắp nơi.
 *   • `PresenceHere` trả lời họ ĐANG Ở ĐÂU — chỉ ghi ở phòng chat và trang chủ
 *     đề, cửa sổ ngắn hơn nhiều.
 *
 * Nên có người online mà không biết đang ở đâu: họ đang xem một trang không
 * ghi dấu, hoặc vừa rời chỗ cũ. Trường hợp ấy để trống chứ không đoán bừa.
 */

export const ONLINE_PER_PAGE = 30;

/** Dấu chỗ đứng cũ hơn ngần này thì coi như họ đã đi chỗ khác. */
const WHERE_WINDOW_MS = 5 * 60 * 1000;

export const ONLINE_TABS = [
  { key: 'tat-ca', label: 'Tất cả' },
  { key: 'dieu-hanh', label: 'Ban điều hành' },
] as const;
export type OnlineTab = (typeof ONLINE_TABS)[number]['key'];

export function isOnlineTab(v: string | undefined): v is OnlineTab {
  return ONLINE_TABS.some((t) => t.key === v);
}

/** Chỗ một người đang đứng, đã dịch sang thứ đọc được. */
export type OnlineSpot =
  | { kind: 'chat' }
  | { kind: 'thread'; id: string; title: string; forumSlug: string }
  | null;

export interface OnlineRow {
  id: string;
  chip: AuthorChip | null;
  role: string;
  mood: string | null;
  lastSeenAt: Date | null;
  spot: OnlineSpot;
}

export interface OnlineResult {
  items: OnlineRow[];
  page: number;
  totalPages: number;
  /** Tổng người đang online, không phụ thuộc bộ lọc đang chọn. */
  total: number;
  /** Số người khớp bộ lọc đang chọn. */
  matched: number;
}

/** `thread:<id>` → id; dạng khác trả về null. */
function threadIdOf(scope: string): string | null {
  return scope.startsWith('thread:') ? scope.slice('thread:'.length) || null : null;
}

export async function getOnline(
  tab: OnlineTab, pageRaw: number,
  viewer: { id: string | null; role?: string | null },
): Promise<OnlineResult> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const where = {
    status: 'ACTIVE' as const,
    lastSeenAt: { gte: since },
    ...(tab === 'dieu-hanh' ? { role: { in: ['ADMIN', 'MODERATOR'] as Role[] } } : {}),
  };

  const [total, matched] = await Promise.all([
    db.user.count({ where: { status: 'ACTIVE', lastSeenAt: { gte: since } } }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(matched / ONLINE_PER_PAGE));
  const page = Math.min(Math.max(1, pageRaw), totalPages);

  const users = await db.user.findMany({
    where,
    // Ai vừa hoạt động thì lên trên — nhìn phát biết ai còn đang gõ.
    orderBy: [{ lastSeenAt: 'desc' }],
    skip: (page - 1) * ONLINE_PER_PAGE,
    take: ONLINE_PER_PAGE,
    // `authorChipSelect` đã có sẵn `role` nên không kê lại ở đây.
    select: { id: true, mood: true, lastSeenAt: true, ...authorChipSelect },
  });
  if (users.length === 0) return { items: [], page, totalPages, total, matched };

  // Chỗ đứng: chỉ hỏi về đúng những người đang hiện trên trang, và chỉ lấy dấu
  // mới nhất của mỗi người — một người có thể còn dấu cũ ở chỗ vừa rời.
  const marks = await db.presenceHere.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      at: { gte: new Date(Date.now() - WHERE_WINDOW_MS) },
    },
    orderBy: { at: 'desc' },
    take: users.length * 4,
    select: { userId: true, scope: true },
  });

  const scopeOf = new Map<string, string>();
  for (const m of marks) if (!scopeOf.has(m.userId)) scopeOf.set(m.userId, m.scope);

  // Tiêu đề chủ đề lấy một lượt cho cả trang, không phải mỗi dòng một truy vấn.
  const threadIds = [...new Set([...scopeOf.values()].map(threadIdOf).filter((x): x is string => !!x))];
  // Khu vực đặt huy hiệu bắt buộc: người xem trang "đang online" này mà chưa
  // có huy hiệu thì không được thấy ai đang xem chủ đề nào trong đó — cùng
  // cách xử lý với chủ đề đã gỡ/đã ẩn ngay bên dưới, chỉ khác lý do.
  const boGiaLuat = viewer.role === 'ADMIN' || viewer.role === 'MODERATOR';
  const myMedalIds = !boGiaLuat && viewer.id
    ? new Set((await db.userMedal.findMany({
        where: { userId: viewer.id }, select: { medalId: true }, take: 200,
      })).map((m) => m.medalId))
    : new Set<string>();
  const threads = threadIds.length
    ? await db.thread.findMany({
        where: {
          id: { in: threadIds }, status: 'PUBLISHED',
          ...(boGiaLuat ? {} : {
            forum: { OR: [{ requiredMedalId: null }, { requiredMedalId: { in: [...myMedalIds] } }] },
          }),
        },
        select: { id: true, title: true, forum: { select: { slug: true } } },
      })
    : [];
  const threadById = new Map(threads.map((t) => [t.id, t]));

  const items: OnlineRow[] = users.map((u) => {
    const scope = scopeOf.get(u.id);
    let spot: OnlineSpot = null;
    if (scope === 'chat') spot = { kind: 'chat' };
    else if (scope) {
      const t = threadById.get(threadIdOf(scope) ?? '');
      // Chủ đề đã bị gỡ hoặc đang ẩn thì coi như không biết họ ở đâu — chớ để
      // trang này thành lối lách xem tên những chủ đề đã khuất.
      if (t) spot = { kind: 'thread', id: t.id, title: t.title, forumSlug: t.forum.slug };
    }
    return { id: u.id, chip: toAuthorChip(u), role: u.role ?? 'USER', mood: u.mood, lastSeenAt: u.lastSeenAt, spot };
  });

  return { items, page, totalPages, total, matched };
}
