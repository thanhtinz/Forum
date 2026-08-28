import { db } from './db';

/**
 * Phạm vi khoá.
 *  - FULL   : chặn đăng nhập luôn (User.status = BANNED)
 *  - POST   : vẫn vào được, nhưng không đăng chủ đề/bài mới
 *  - COMMENT: vẫn vào được, nhưng không trả lời/bình luận
 */
export const BAN_SCOPES = [
  { value: 'FULL', label: 'Khoá đăng nhập', hint: 'Không đăng nhập được cho tới khi hết hạn.' },
  { value: 'POST', label: 'Cấm đăng bài', hint: 'Vẫn xem và bình luận được, chỉ không đăng chủ đề mới.' },
  { value: 'COMMENT', label: 'Cấm bình luận', hint: 'Vẫn xem và đăng bài được, chỉ không trả lời/bình luận.' },
] as const;

export type BanScopeValue = (typeof BAN_SCOPES)[number]['value'];

export const BAN_DURATIONS = [
  { days: 1, label: '1 ngày' },
  { days: 3, label: '3 ngày' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 0, label: 'Vĩnh viễn' },
] as const;

export function isBanScope(v: string): v is BanScopeValue {
  return BAN_SCOPES.some((s) => s.value === v);
}

/** Mốc hết hạn cho số ngày đã chọn; 0 ngày nghĩa là vĩnh viễn (null). */
export function banExpiry(days: number, now = new Date()): Date | null {
  if (!(days > 0)) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Lệnh cấm còn hiệu lực theo phạm vi. Hết hạn (expiresAt đã qua) thì coi như không còn.
 * Trả về lệnh hết hạn muộn nhất để thông báo cho đúng.
 */
export async function getActiveBan(userId: string, scope: BanScopeValue) {
  const now = new Date();
  return db.ban.findFirst({
    where: {
      userId,
      scope,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, reason: true, scope: true, expiresAt: true, createdAt: true },
  });
}

/**
 * Gỡ khoá đăng nhập khi lệnh cấm FULL đã hết hạn.
 *
 * Người bị khoá FULL không đăng nhập được nên không có gì chạy để tự mở khoá
 * cho họ; phải kiểm ngay lúc họ thử đăng nhập. Trả về true nếu tài khoản được
 * phép vào.
 *
 * Hai điều kiện chặt phải giữ, vì hàm này chạy trên đường ĐĂNG NHẬP — tức là
 * người gọi chưa chứng minh mình là ai:
 *
 *   1. Chỉ mở khoá khi thật sự CÓ một lệnh cấm FULL đã hết hạn. Trước đây hàm
 *      update vô điều kiện, nên tài khoản bị khoá mà hàng `Ban` đã bị xoá tay
 *      là người lạ chỉ cần gõ đúng tên rồi nhập mật khẩu bừa cũng mở khoá được.
 *   2. Chỗ gọi phải đặt SAU khi so mật khẩu thành công (xem `src/lib/auth.ts`),
 *      để chỉ chính chủ mới kích hoạt được việc ghi này.
 */
export async function liftExpiredFullBan(userId: string): Promise<boolean> {
  const active = await getActiveBan(userId, 'FULL');
  if (active) return false;

  // Có lệnh FULL nào đó nhưng đã hết hạn thì mới là "hết hạn, cho vào lại".
  const expired = await db.ban.findFirst({
    where: { userId, scope: 'FULL', expiresAt: { not: null, lte: new Date() } },
    select: { id: true },
  });
  if (!expired) return false;

  await db.user.update({ where: { id: userId }, data: { status: 'ACTIVE' }, select: { id: true } });
  return true;
}

export function banMessage(ban: { reason: string; expiresAt: Date | null }, action: string): string {
  const until = ban.expiresAt
    ? ` tới ${ban.expiresAt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : ' vĩnh viễn';
  return `Bạn đang bị cấm ${action}${until}. Lý do: ${ban.reason}`;
}
