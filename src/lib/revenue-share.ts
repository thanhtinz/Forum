/**
 * Chia điểm khi có người mở khoá nội dung ẩn.
 *
 * Trước đây nằm trong `purchase.ts` cùng cả bộ máy đơn hàng của mục bài viết.
 * Mục ấy đã bỏ, chỗ duy nhất còn thu điểm là khối `[hide=diem:N]` trong bài
 * diễn đàn — nên chỉ còn đúng phép chia này.
 *
 * Tệp này KHÔNG import gì: `site-const.ts` lấy mặc định từ đây, và bài kiểm
 * `.mjs` nạp thẳng được. Đừng thêm import vào, kể cả import kiểu.
 */

/**
 * Phần nền tảng giữ lại (%) khi admin chưa đặt gì.
 *
 * Con số thật lấy từ `getSiteSettings().hoaHongPhanTram` — trang Cài đặt chung
 * chỉnh được. Hằng số này chỉ còn là mặc định cho chỗ gọi không truyền vào.
 */
export const PLATFORM_COMMISSION_PERCENT = 30;

/**
 * Kẹp mức hoa hồng về 0–100 và làm tròn.
 *
 * Giá trị nằm trong cột `Json` của `SiteSetting` nên có thể là bất cứ thứ gì —
 * số âm hay trên 100 đều làm `authorShareOf` trả ra số vô lý: trừ điểm tác giả,
 * hoặc trả tác giả nhiều hơn số người mua bỏ ra.
 */
export function chuanHoaHoaHong(v: unknown): number {
  // `Number(null)` và `Number('')` đều ra 0 — mà "chưa đặt" phải rơi về mặc
  // định chứ không phải thành "nền tảng không giữ lại đồng nào".
  if (v === null || v === undefined || v === '') return PLATFORM_COMMISSION_PERCENT;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return PLATFORM_COMMISSION_PERCENT;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Phần chia cho tác giả từ một lượt mở khoá. */
export function authorShareOf(amount: number, hoaHongPhanTram = PLATFORM_COMMISSION_PERCENT): number {
  const giu = Math.min(100, Math.max(0, hoaHongPhanTram));
  return Math.floor((amount * (100 - giu)) / 100);
}
