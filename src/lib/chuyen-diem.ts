/**
 * Chuyển điểm giữa thành viên, và mã quà tặng.
 *
 * Dựng lại từ `chuyen-tien.php` và `giftcode.php` của bộ mod JohnCMS cũ. Giữ
 * nguyên hai nếp đặc trưng của bản ấy:
 *   • phải có bài trên diễn đàn mới được chuyển — tài khoản lập ra chỉ để hứng
 *     điểm thì không dùng được,
 *   • người gửi chịu PHÍ, người nhận nhận phần còn lại. Phí là thứ giữ cho việc
 *     chuyền điểm vòng quanh giữa mấy nick của cùng một người không sinh lợi.
 *
 * Chỉ đổi đơn vị cho hợp thang điểm ở đây (bản cũ 1.000–50.000 xu).
 */

/** Số bài tối thiểu trên diễn đàn mới được chuyển điểm. */
export const CHUYEN_MIN_BAI = 20;

export const CHUYEN_MIN = 10;
export const CHUYEN_MAX = 500;

/** Phí chuyển, tính trên số điểm gửi đi. Bản gốc lấy 20%. */
export const CHUYEN_PHI = 0.2;

/** Trần số điểm gửi đi trong một ngày. */
export const CHUYEN_MOI_NGAY = 1000;

/** Người nhận thực nhận bao nhiêu sau khi trừ phí. */
export function sauPhi(gui: number): number {
  return Math.floor(gui * (1 - CHUYEN_PHI));
}

/** Độ dài mã quà tặng. */
export const CODE_LENGTH = 8;

/**
 * Bộ ký tự sinh mã — cố ý BỎ những chữ dễ đọc nhầm khi chép tay: số 0 với chữ
 * O, số 1 với chữ I và L. Mã quà hay được đọc qua điện thoại hoặc chép từ ảnh.
 */
const CHU_MA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function sinhMa(): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += CHU_MA[Math.floor(Math.random() * CHU_MA.length)];
  }
  return s;
}

/** Chuẩn hoá mã người dùng gõ vào: viết hoa, bỏ dấu cách và gạch nối. */
export function chuanHoaMa(v: string): string {
  return v.trim().toUpperCase().replace(/[\s-]/g, '');
}
