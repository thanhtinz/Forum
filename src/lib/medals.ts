import { db } from './db';
import { notify } from './notify';

/**
 * Điều kiện trao tự động mà checkAndAwardMedals biết xử lý.
 * Để ở đây (không ở actions.ts) vì file 'use server' chỉ được export hàm async.
 */
export const MEDAL_CONDITIONS = [
  { value: '', label: 'Trao tay (không tự động)' },
  { value: 'checkin_streak', label: 'Chuỗi điểm danh liên tiếp' },
  { value: 'checkin_total', label: 'Tổng số ngày điểm danh' },
  { value: 'posts_count', label: 'Số bài đã đăng' },
  { value: 'level', label: 'Cấp độ đạt được' },
] as const;


/**
 * Kiểm tra và trao các huy chương tự động (autoGrant) mà người dùng đủ điều kiện
 * nhưng chưa sở hữu. An toàn khi gọi lặp lại (idempotent nhờ @@unique).
 *
 * Điều kiện hỗ trợ:
 *  - checkin_streak: chuỗi điểm danh hiện tại ≥ conditionValue
 *  - checkin_total : tổng số ngày điểm danh ≥ conditionValue
 *  - posts_count   : số bài đã đăng ≥ conditionValue
 *  - level         : cấp độ ≥ conditionValue
 */
export async function checkAndAwardMedals(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { checkinStreak: true, totalCheckinDays: true, level: true },
  });
  if (!user) return [];

  const medals = await db.medal.findMany({
    where: { autoGrant: true, conditionType: { not: null }, users: { none: { userId } } },
    select: { id: true, name: true, slug: true, conditionType: true, conditionValue: true },
  });
  if (medals.length === 0) return [];

  // Chỉ đếm bài viết nếu có huy chương cần đến
  const needsPosts = medals.some((m) => m.conditionType === 'posts_count');
  const postsCount = needsPosts ? await db.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }) : 0;

  const stat = (type: string | null): number => {
    switch (type) {
      case 'checkin_streak': return user.checkinStreak;
      case 'checkin_total': return user.totalCheckinDays;
      case 'posts_count': return postsCount;
      case 'level': return user.level;
      default: return -1;
    }
  };

  const awarded: string[] = [];
  for (const m of medals) {
    if (m.conditionValue == null) continue;
    if (stat(m.conditionType) >= m.conditionValue) {
      try {
        await db.userMedal.create({ data: { userId, medalId: m.id } });
        awarded.push(m.name);
        await notify({ userId, type: 'SYSTEM', title: 'Bạn nhận được huy chương mới!', content: `“${m.name}” đã được thêm vào bộ sưu tập của bạn.`, link: '/user/dashboard' });
      } catch { /* đã có (đua tranh) → bỏ qua */ }
    }
  }
  return awarded;
}
