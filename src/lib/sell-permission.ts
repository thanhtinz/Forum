/**
 * Ai được khoá nội dung bằng cái gì.
 *
 * Hai loại tiền trong hệ thống không lẫn vào nhau:
 *
 *  · ĐIỂM  — kiếm được bằng hoạt động trên diễn đàn. Thành viên tự khoá phần
 *            nội dung ẩn của mình bằng điểm được: điểm luân chuyển trong cộng
 *            đồng, không ai mất tiền thật.
 *  · TIỀN NẠP (VND) — chỉ tiêu vào hàng của nền tảng: cửa hàng và gói VIP.
 *            Vì vậy chỉ quản trị viên mới đặt được giá bằng tiền.
 */

/** Khoá bằng tiền nạp hoặc theo hạng VIP — hàng của nền tảng, chỉ admin đăng. */
export const MONEY_ACCESS = ['PAID', 'VIP_ONLY'] as const;

/** Khoá bằng điểm — thành viên nào cũng dùng được cho bài của mình. */
export const POINTS_ACCESS = ['POINTS'] as const;

/** Mọi mức có khoá nội dung ẩn sau một cái giá / một hạng. */
export const PAID_ACCESS = [...POINTS_ACCESS, ...MONEY_ACCESS] as const;

/** Mức truy cập không khoá gì. */
export const FREE_ACCESS = ['FREE', 'LOGIN_REQUIRED'] as const;

/**
 * Chỉ quản trị viên mới đặt được giá bằng TIỀN NẠP (và khoá theo VIP).
 * Cửa hàng và gói VIP là hàng của nền tảng, không phải chỗ thành viên tự bán.
 */
export function canSellForMoney(role: string | undefined | null): boolean {
  return role === 'ADMIN';
}

export function isMoneyAccess(access: string): boolean {
  return (MONEY_ACCESS as readonly string[]).includes(access);
}

export function isPaidAccess(access: string): boolean {
  return (PAID_ACCESS as readonly string[]).includes(access);
}
