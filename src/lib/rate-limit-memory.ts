/**
 * Rate limit đơn giản trong bộ nhớ (sliding window).
 *
 * Đủ cho một instance; khi chạy nhiều instance nên chuyển sang Redis
 * (REDIS_URL) — interface giữ nguyên nên chỉ cần thay phần lưu trữ.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Dọn bucket cũ để map không phình theo thời gian. */
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (b.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** `limit` lượt trong `windowSec` giây cho mỗi `key`. */
export function rateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const windowMs = windowSec * 1000;
  sweep(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0]!;
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}
