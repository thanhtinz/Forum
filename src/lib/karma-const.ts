/**
 * Uy tín — "karma" của forum wap ngày trước.
 *
 * Mỗi thành viên chấm cho người khác một nấc "+" hoặc "−" kèm lý do; tổng các
 * nấc ấy hiện cạnh nick ở mọi bài. Luật ở đây cốt để cái nút ấy không thành
 * chỗ dìm nhau: phải có lý do, phải có chút thâm niên, mỗi người chỉ chấm cho
 * cùng một người một lần mỗi ngày, và mỗi ngày cũng chỉ chấm được ngần này
 * người.
 */

export const KARMA_REASON_MIN = 3;
export const KARMA_REASON_MAX = 120;

/** Phải có ngần này bài (chủ đề + trả lời) mới được chấm uy tín cho người khác. */
export const KARMA_MIN_POSTS = 5;
/** Cùng một người: chấm xong phải đợi ngần này giờ mới chấm tiếp. */
export const KARMA_COOLDOWN_HOURS = 24;
/** Mỗi người mỗi ngày chấm được nhiều nhất ngần này lượt, tính chung mọi người nhận. */
export const KARMA_DAILY_MAX = 10;

export const KARMA_PAGE_SIZE = 20;

/** Danh hiệu theo mức uy tín — chỉ để đọc cho có hình dung. */
export function karmaLabel(total: number): string {
  if (total >= 50) return 'Rất uy tín';
  if (total >= 10) return 'Uy tín';
  if (total > 0) return 'Được quý mến';
  if (total === 0) return 'Chưa ai chấm';
  if (total > -10) return 'Bị phàn nàn';
  return 'Tai tiếng';
}

/** Màu con số uy tín: dương xanh, âm đỏ, không thì xám. */
export function karmaTone(total: number): string {
  if (total > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (total < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-ink-400';
}

/** Số uy tín kèm dấu, kiểu "+12" / "−3". */
export function karmaSigned(total: number): string {
  if (total > 0) return `+${total}`;
  if (total < 0) return `−${Math.abs(total)}`;
  return '0';
}

