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

/** Thời gian tương đối kiểu diễn đàn: "vừa xong", "5 phút", "3 giờ", "2 ngày", cũ hơn thì dd/MM/yy */
export function fmtAgo(date?: Date | string | null, now = new Date()): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'vừa xong';
  if (sec < 3600) return `${Math.floor(sec / 60)} phút`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)} ngày`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`;
}

/** Bỏ thẻ HTML, gom khoảng trắng — dùng cho trích đoạn nội dung. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

/**
 * Màu tên hiển thị theo vai trò — nếp "nick màu" của forum Việt thời 2010:
 * nhìn màu là biết ai quản trị, ai điều hành.
 */
export function nickClass(role?: string | null): string {
  if (role === 'ADMIN') return 'text-red-600 dark:text-red-400';
  if (role === 'MODERATOR') return 'text-emerald-600 dark:text-emerald-400';
  return 'text-brand-700 dark:text-brand-300';
}
