import { db } from './db';
import { grantPoints } from './points';

export interface CheckinResult {
  ok: boolean;
  already?: boolean;
  earned?: number;
  streak?: number;
}

/** Ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh = UTC+7), dạng yyyy-mm-dd. */
function vnDateStr(d: Date): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const BASE_POINTS = 5;
const MAX_STREAK_BONUS = 10;

/**
 * Điểm danh 1 lần/ngày (theo giờ VN). Tính chuỗi (streak), thưởng điểm
 * (cơ bản + thưởng theo chuỗi), tất cả trong một transaction.
 */
export async function doCheckin(userId: string): Promise<CheckinResult> {
  const now = new Date();
  const today = vnDateStr(now);

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { lastCheckinAt: true, checkinStreak: true },
    });
    if (!user) return { ok: false };

    if (user.lastCheckinAt && vnDateStr(user.lastCheckinAt) === today) {
      return { ok: true, already: true, streak: user.checkinStreak };
    }

    // Chuỗi: nếu điểm danh gần nhất là hôm qua → +1, ngược lại reset về 1
    const yesterday = vnDateStr(new Date(now.getTime() - 24 * 3600 * 1000));
    const streak = user.lastCheckinAt && vnDateStr(user.lastCheckinAt) === yesterday ? user.checkinStreak + 1 : 1;
    const earned = BASE_POINTS + Math.min(streak, MAX_STREAK_BONUS);

    await tx.user.update({
      where: { id: userId },
      data: { checkinStreak: streak, lastCheckinAt: now, totalCheckinDays: { increment: 1 } },
    });
    await grantPoints({ userId, amount: earned, reason: 'CHECKIN', note: `Điểm danh ngày ${today} (chuỗi ${streak})` }, tx);

    return { ok: true, earned, streak };
  });
}
