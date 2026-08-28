import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { GAME_CDN_BASE } from '@/lib/game';

export { assetUrl } from '@/lib/game';

/**
 * Hạ tầng phân phối file game.
 *
 * File JAR/JAD/ảnh nằm trên object storage và được CDN phục vụ. Backend không
 * trả link storage trực tiếp mà ký một URL có hạn dùng (signed URL) để chống
 * hotlink và để ghi nhận sự kiện download đúng chỗ.
 */

/**
 * Khoá ký signed URL.
 *
 * Thiếu khoá ở production thì DỪNG HẲN chứ không lặng lẽ dùng giá trị dự
 * phòng: giá trị dự phòng nằm ngay trong mã nguồn, ai đọc được mã là tự ký
 * được token tải mọi file game — kể cả game phải trả điểm mới mở khoá.
 */
const SIGN_SECRET = (() => {
  const key = process.env.GAME_SIGN_SECRET || process.env.AUTH_SECRET;
  if (key) return key;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu GAME_SIGN_SECRET (hoặc AUTH_SECRET) — không thể ký link tải file game.');
  }
  return 'nova-dev-secret';
})();

/** Hạn mặc định của signed URL (giây). */
export const SIGNED_URL_TTL = 300;

export interface SignedPayload {
  /** storage key của file */
  k: string;
  /** epoch giây hết hạn */
  e: number;
  /** id người dùng hoặc khoá khách — ràng buộc link vào người tải */
  a: string;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', SIGN_SECRET).update(data).digest('base64url');
}

/** Tạo token đã ký cho một storage key. */
export function signFileToken(storageKey: string, actorKey: string, ttlSec = SIGNED_URL_TTL): string {
  const payload: SignedPayload = { k: storageKey, e: Math.floor(Date.now() / 1000) + ttlSec, a: actorKey };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Kiểm tra token; trả payload nếu hợp lệ, null nếu sai chữ ký/hết hạn. */
export function verifyFileToken(token: string): SignedPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedPayload;
    if (!payload.k || typeof payload.e !== 'number') return null;
    if (payload.e < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** URL tải có chữ ký — CDN nếu đã cấu hình, ngược lại qua route của app. */
export function signedFileUrl(storageKey: string, actorKey: string, ttlSec = SIGNED_URL_TTL): string {
  const token = signFileToken(storageKey, actorKey, ttlSec);
  const qs = `?token=${encodeURIComponent(token)}`;
  return GAME_CDN_BASE ? `${GAME_CDN_BASE}/${storageKey}${qs}` : `/api/games/files${qs}`;
}

/** Checksum sha256 của buffer — dùng khi upload và khi kiểm tra integrity. */
export function sha256(buf: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** So sánh checksum an toàn (không phân biệt hoa/thường). */
export function checksumMatches(expected: string | null | undefined, actual: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(actual.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tên file gợi ý khi tải: `contra-1.0.2.jar`. */
export function downloadFileName(slug: string, version: string, type: string): string {
  return `${slug}-${version}.${type.toLowerCase()}`;
}
