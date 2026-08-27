import { db } from './db';

export const ONLINE_RECORD_KEY = 'online_record';

export interface OnlineRecord {
  count: number;
  at: string | null;
}

/**
 * Kỷ lục số người cùng trực tuyến.
 *
 * "Kỷ lục: 342 thành viên lúc 21:15 ngày 03/07" là dòng gần như forum Việt nào
 * thời 2010 cũng dán ở chân trang. Ghi vào SiteSetting nên không cần bảng riêng;
 * chỉ ghi khi thật sự phá kỷ lục, tức là hầu như không bao giờ ghi.
 */
export async function bumpOnlineRecord(current: number): Promise<OnlineRecord> {
  const row = await db.siteSetting.findUnique({ where: { key: ONLINE_RECORD_KEY } }).catch(() => null);
  const saved = (row?.value ?? {}) as Partial<OnlineRecord>;
  const best = typeof saved.count === 'number' ? saved.count : 0;

  if (current <= best) return { count: best, at: saved.at ?? null };

  const next: OnlineRecord = { count: current, at: new Date().toISOString() };
  await db.siteSetting
    .upsert({
      where: { key: ONLINE_RECORD_KEY },
      create: { key: ONLINE_RECORD_KEY, value: { ...next } },
      update: { value: { ...next } },
      select: { key: true },
    })
    .catch(() => {});
  return next;
}
