/** Gộp className có điều kiện (thay cho clsx nhẹ). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Định dạng số gọn: 1.2K, 3.4M */
export function fmtCount(n?: number | null): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

/** Định dạng tiền VND */
export function fmtVnd(n?: number | null): string {
  return `${(n ?? 0).toLocaleString('vi-VN')}₫`;
}

/** Cắt chuỗi kèm dấu … */
export function truncate(s: string, max = 160): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

/** Định dạng dung lượng file: 1.5 MB, 48.2 MB, 2.1 GB */
export function fmtBytes(bytes?: number | bigint | null): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes ?? 0;
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const v = n / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
