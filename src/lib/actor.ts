import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { actorKeyOf, clientIp } from '@/lib/game-stats';

/** Cookie định danh khách (không đăng nhập) cho phiên emulator & thống kê unique. */
export const GUEST_COOKIE = 'nova_gid';
const GUEST_MAX_AGE = 180 * 86400;

export interface Actor {
  userId: string | null;
  guestKey: string | null;
  actorKey: string;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Định danh người đang thao tác. Dùng cho mọi API game: thống kê unique, giới
 * hạn phiên đồng thời và ràng buộc signed URL vào đúng người tải.
 *
 * `ensureGuestCookie` chỉ đặt được trong Route Handler / Server Action.
 */
export async function getActor(ensureGuestCookie = false): Promise<Actor> {
  const [session, h, jar] = await Promise.all([auth(), headers(), cookies()]);
  const userId = session?.user?.id ?? null;
  const ip = clientIp(h);
  const userAgent = h.get('user-agent');

  let guestKey: string | null = jar.get(GUEST_COOKIE)?.value ?? null;
  if (!userId && !guestKey && ensureGuestCookie) {
    guestKey = randomUUID();
    try {
      jar.set(GUEST_COOKIE, guestKey, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: GUEST_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
      });
    } catch {
      // Server Component không cho ghi cookie — bỏ qua, chỉ dùng trong phiên này.
    }
  }

  return {
    userId,
    guestKey: userId ? null : guestKey,
    actorKey: actorKeyOf(userId, guestKey ?? ip, userAgent),
    ip,
    userAgent,
  };
}
