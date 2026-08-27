import { db } from './db';
import { cosmeticSelect, toCosmetics } from './shop';
import type { Cosmetics } from './shop-const';
import { KARMA_COOLDOWN_HOURS, KARMA_DAILY_MAX, KARMA_MIN_POSTS, KARMA_PAGE_SIZE } from './karma-const';

export * from './karma-const';

export interface KarmaRow {
  id: string;
  value: number;
  reason: string;
  createdAt: Date;
  from: {
    username: string | null; name: string | null; image: string | null;
    level: number; role: string; cosmetics: Cosmetics;
  };
}

export interface KarmaPage {
  items: KarmaRow[];
  total: number;
  totalPages: number;
  /** Số lượt "+" và "−" đã nhận, để in thành "12 khen · 3 chê". */
  up: number;
  down: number;
}

/** Sổ uy tín công khai của một người. */
export async function getKarmaPage(userId: string, page = 1): Promise<KarmaPage> {
  const where = { toId: userId };
  const [total, rows, tally] = await Promise.all([
    db.karmaVote.count({ where }),
    db.karmaVote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * KARMA_PAGE_SIZE,
      take: KARMA_PAGE_SIZE,
      select: {
        id: true, value: true, reason: true, createdAt: true,
        from: { select: { username: true, name: true, image: true, level: true, role: true, ...cosmeticSelect } },
      },
    }),
    // Gom nhóm để đếm khen/chê: cơ sở dữ liệu đếm hộ, không kéo hàng nào về.
    db.karmaVote.groupBy({ by: ['value'], where, _count: { _all: true } }),
  ]);

  const countOf = (v: number) => tally.find((t) => t.value === v)?._count._all ?? 0;

  return {
    items: rows.map((r) => ({ ...r, from: { ...r.from, cosmetics: toCosmetics(r.from) } })),
    total,
    totalPages: Math.ceil(total / KARMA_PAGE_SIZE),
    up: countOf(1),
    down: countOf(-1),
  };
}

/** Kết quả kiểm tra quyền chấm — hỏng thì kèm sẵn câu để hiện cho người dùng. */
export type KarmaPermission = { can: true } | { can: false; reason: string };

/**
 * Người này có chấm uy tín cho người kia lúc này được không.
 *
 * Dùng ở cả hai đầu: giao diện gọi để biết có nên hiện nút, và hành động gọi
 * lại lần nữa trước khi ghi — nút chỉ là gợi ý, ai cũng gửi thẳng biểu mẫu được.
 */
export async function checkKarmaPermission(fromId: string | null, toId: string): Promise<KarmaPermission> {
  if (!fromId) return { can: false, reason: 'Bạn cần đăng nhập để chấm uy tín.' };
  if (fromId === toId) return { can: false, reason: 'Không tự chấm uy tín cho mình được.' };

  const me = await db.user.findUnique({
    where: { id: fromId },
    select: { _count: { select: { threads: true, replies: true } } },
  });
  const posts = (me?._count.threads ?? 0) + (me?._count.replies ?? 0);
  if (posts < KARMA_MIN_POSTS) {
    return { can: false, reason: `Cần ít nhất ${KARMA_MIN_POSTS} bài trên diễn đàn mới được chấm uy tín.` };
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentForTarget, todayCount] = await Promise.all([
    db.karmaVote.findFirst({
      where: { fromId, toId, createdAt: { gte: new Date(Date.now() - KARMA_COOLDOWN_HOURS * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
    db.karmaVote.count({ where: { fromId, createdAt: { gte: dayAgo } } }),
  ]);

  if (recentForTarget) {
    return { can: false, reason: `Bạn đã chấm cho người này rồi, ${KARMA_COOLDOWN_HOURS} giờ sau mới chấm tiếp được.` };
  }
  if (todayCount >= KARMA_DAILY_MAX) {
    return { can: false, reason: `Mỗi ngày chỉ chấm được ${KARMA_DAILY_MAX} lượt.` };
  }
  return { can: true };
}
