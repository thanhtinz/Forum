import { db } from './db';
import { isVipActive } from './access';

export interface DownloadQuotaUser {
  level: number;
  vipTier: number | null;
  vipExpiresAt: Date | null;
  vipPermanent: boolean;
}

/**
 * Giới hạn số lượt tải mỗi ngày theo cấp độ / hạng VIP.
 * VIP luôn được ưu tiên hơn cấp độ thường. `Infinity` = không giới hạn.
 */
export function dailyDownloadLimit(user: DownloadQuotaUser): number {
  if (isVipActive(user)) {
    const tier = user.vipTier ?? 1;
    if (tier >= 3) return Infinity;
    if (tier === 2) return 100;
    return 40; // VIP tier 1
  }
  // Theo cấp độ thường
  if (user.level >= 10) return 30;
  if (user.level >= 5) return 20;
  if (user.level >= 2) return 10;
  return 5; // người mới
}

/** Mốc 00:00 giờ Việt Nam (UTC+7) của hôm nay, trả về Date theo UTC. */
export function vnStartOfToday(now = new Date()): Date {
  const vnMs = now.getTime() + 7 * 3600 * 1000;
  const vnMidnight = new Date(vnMs);
  vnMidnight.setUTCHours(0, 0, 0, 0);
  return new Date(vnMidnight.getTime() - 7 * 3600 * 1000);
}

/** Số lượt đã tải trong ngày (giờ VN) của người dùng. */
export async function todayDownloadCount(userId: string): Promise<number> {
  return db.downloadLog.count({ where: { userId, createdAt: { gte: vnStartOfToday() } } });
}
