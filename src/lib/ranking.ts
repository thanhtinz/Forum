import { db } from './db';

export const RANK_METRICS = [
  { key: 'points', label: 'Điểm', unit: 'điểm' },
  { key: 'threads', label: 'Chủ đề', unit: 'chủ đề' },
  { key: 'replies', label: 'Trả lời', unit: 'trả lời' },
  { key: 'posts', label: 'Bài viết', unit: 'bài' },
  { key: 'level', label: 'Cấp độ', unit: 'EXP' },
] as const;

export type RankMetric = (typeof RANK_METRICS)[number]['key'];

export const RANK_PERIODS = [
  { key: 'week', label: 'Tuần này', days: 7 },
  { key: 'month', label: 'Tháng này', days: 30 },
  { key: 'all', label: 'Tất cả', days: 0 },
] as const;

export type RankPeriod = (typeof RANK_PERIODS)[number]['key'];

/** Cấp độ là con số tích luỹ, không cắt theo kỳ được. */
export function isCumulative(metric: RankMetric): boolean {
  return metric === 'level';
}

export const RANK_SIZE = 50;

export interface RankRow {
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  level: number;
  value: number;
}

function since(period: RankPeriod): Date | null {
  const d = RANK_PERIODS.find((p) => p.key === period)?.days ?? 0;
  return d > 0 ? new Date(Date.now() - d * 24 * 60 * 60 * 1000) : null;
}

/**
 * Đếm theo từng người trong kỳ rồi gắn thông tin hiển thị.
 *
 * Gom nhóm trước, lấy hồ sơ sau: một truy vấn đếm và một truy vấn lấy người,
 * thay vì đọc cả bảng người dùng rồi đếm từng người một.
 */
async function tally(
  metric: Exclude<RankMetric, 'level'>,
  period: RankPeriod,
): Promise<RankRow[]> {
  const from = since(period);
  const when = from ? { gte: from } : undefined;

  let counted: { userId: string; value: number }[];

  if (metric === 'points') {
    // Chỉ tính điểm kiếm được, trừ đi phần tiêu thì thứ hạng thành ai ít mua nhất.
    const rows = await db.pointsLog.groupBy({
      by: ['userId'],
      where: { amount: { gt: 0 }, ...(when ? { createdAt: when } : {}) },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: RANK_SIZE,
    });
    counted = rows.map((r) => ({ userId: r.userId, value: r._sum.amount ?? 0 }));
  } else {
    const where = when ? { createdAt: when } : {};
    const rows = metric === 'threads'
      ? await db.thread.groupBy({
          by: ['authorId'], where: { ...where, status: 'PUBLISHED' },
          _count: { _all: true }, orderBy: { _count: { authorId: 'desc' } }, take: RANK_SIZE,
        })
      : metric === 'replies'
        ? await db.reply.groupBy({
            by: ['authorId'], where: { ...where, hidden: false },
            _count: { _all: true }, orderBy: { _count: { authorId: 'desc' } }, take: RANK_SIZE,
          })
        : await db.post.groupBy({
            by: ['authorId'], where: { ...where, status: 'PUBLISHED' },
            _count: { _all: true }, orderBy: { _count: { authorId: 'desc' } }, take: RANK_SIZE,
          });
    counted = rows.map((r) => ({ userId: r.authorId, value: r._count._all }));
  }

  if (counted.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: counted.map((c) => c.userId) }, status: 'ACTIVE' },
    select: { id: true, username: true, name: true, image: true, level: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return counted
    .map((c) => {
      const u = byId.get(c.userId);
      return u ? { userId: u.id, username: u.username, name: u.name, image: u.image, level: u.level, value: c.value } : null;
    })
    .filter((r): r is RankRow => r !== null);
}

/** Bảng xếp hạng theo tiêu chí và khoảng thời gian. */
export async function getRanking(metric: RankMetric, period: RankPeriod): Promise<RankRow[]> {
  if (metric === 'level') {
    const users = await db.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'desc' }, { exp: 'desc' }],
      take: RANK_SIZE,
      select: { id: true, username: true, name: true, image: true, level: true, exp: true },
    });
    return users.map((u) => ({
      userId: u.id, username: u.username, name: u.name, image: u.image, level: u.level, value: u.exp,
    }));
  }
  return tally(metric, period);
}
