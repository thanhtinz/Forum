/** Các mức truy cập tính là "bán hàng" (thu điểm/tiền hoặc khoá theo VIP). */
export const PAID_ACCESS = ['POINTS', 'PAID', 'VIP_ONLY'] as const;

/** Mức truy cập thành viên thường được phép dùng khi đăng bài. */
export const FREE_ACCESS = ['FREE', 'LOGIN_REQUIRED'] as const;

/**
 * Chỉ quản trị viên mới được đăng bán nội dung (cửa hàng là hàng của nền tảng).
 * Thành viên thường đăng bài miễn phí và tham gia diễn đàn.
 */
export function canSellContent(role: string | undefined | null): boolean {
  return role === 'ADMIN';
}

export function isPaidAccess(access: string): boolean {
  return (PAID_ACCESS as readonly string[]).includes(access);
}
