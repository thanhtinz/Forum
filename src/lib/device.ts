import { headers } from 'next/headers';

/**
 * Nhận diện thiết bị di động.
 *
 * Play Online chỉ mở trên điện thoại: game Java ME vốn thiết kế cho màn hình
 * dọc nhỏ và bàn phím số, chơi bằng chuột trên desktop vừa sai trải nghiệm vừa
 * tốn tài nguyên emulator. Kho game thì vẫn xem/tải được ở mọi thiết bị.
 */

/** Máy tính bảng cỡ lớn không tính là điện thoại (iPad báo UA riêng). */
const MOBILE_RE = /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|BB10|IEMobile|Opera Mini|Mobile.*Firefox/i;
const TABLET_RE = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;

export type DeviceKind = 'mobile' | 'tablet' | 'desktop';

export function deviceFromUA(ua: string | null | undefined): DeviceKind {
  if (!ua) return 'desktop';
  if (MOBILE_RE.test(ua)) return 'mobile';
  if (TABLET_RE.test(ua)) return 'tablet';
  return 'desktop';
}

/** true nếu request đến từ điện thoại (máy tính bảng vẫn được coi là hợp lệ). */
export function isMobileUA(ua: string | null | undefined): boolean {
  const kind = deviceFromUA(ua);
  return kind === 'mobile' || kind === 'tablet';
}

/** Đọc thiết bị từ header của request hiện tại. Chỉ dùng trong Server Component. */
export async function isMobileRequest(): Promise<boolean> {
  const h = await headers();
  return isMobileUA(h.get('user-agent'));
}

export async function deviceKind(): Promise<DeviceKind> {
  const h = await headers();
  return deviceFromUA(h.get('user-agent'));
}
