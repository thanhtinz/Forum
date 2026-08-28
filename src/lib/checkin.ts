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

  // Mốc 00:00 hôm nay theo giờ VN, quy về giờ UTC để so thẳng trong truy vấn.
  const dauNgay = new Date(Date.parse(`${today}T00:00:00Z`) - 7 * 3600 * 1000);

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

    // Ghi CÓ ĐIỀU KIỆN chứ không ghi thẳng: bấm hai lần cùng lúc thì cả hai
    // cùng đọc thấy "hôm nay chưa điểm danh" ở trên và cùng ăn điểm. Điều kiện
    // "mốc cũ phải nằm trước 00:00 hôm nay" chỉ đúng với một luồng duy nhất.
    const ghi = await tx.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastCheckinAt: null }, { lastCheckinAt: { lt: dauNgay } }],
      },
      data: { checkinStreak: streak, lastCheckinAt: now, totalCheckinDays: { increment: 1 } },
    });
    if (ghi.count === 0) return { ok: true, already: true, streak: user.checkinStreak };
    await grantPoints({ userId, amount: earned, reason: 'CHECKIN', note: `Điểm danh ngày ${today} (chuỗi ${streak})` }, tx);

    return { ok: true, earned, streak };
  });
}
