/**
 * Chia điểm khi có người mở khoá nội dung ẩn.
 *
 * Trước đây nằm trong `purchase.ts` cùng cả bộ máy đơn hàng của mục bài viết.
 * Mục ấy đã bỏ, chỗ duy nhất còn thu điểm là khối `[hide=diem:N]` trong bài
 * diễn đàn — nên chỉ còn đúng phép chia này.
 */

/**
 * Phần nền tảng giữ lại (%). Tác giả nhận (100 − x)% số điểm mỗi lượt mở khoá.
 * TODO: cho admin cấu hình qua SiteSetting.
 */
export const PLATFORM_COMMISSION_PERCENT = 30;

/** Phần chia cho tác giả từ một lượt mở khoá. */
export function authorShareOf(amount: number): number {
  return Math.floor((amount * (100 - PLATFORM_COMMISSION_PERCENT)) / 100);
}
