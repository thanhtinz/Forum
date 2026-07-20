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
