import type { NotificationType } from '@prisma/client';

/**
 * Các loại thông báo người dùng được phép tắt.
 *
 * ORDER và SYSTEM không có ở đây: đó là việc liên quan tới tài khoản, tắt đi
 * thì người dùng bỏ lỡ những thứ không thể bỏ lỡ. DONATE cũng vậy — ai tặng
 * điểm cho mình thì phải biết.
 */
export const TOGGLEABLE_TYPES = ['COMMENT', 'REPLY', 'MENTION', 'LIKE', 'FOLLOW', 'MEDAL', 'GUESTBOOK', 'FRIEND'] as const;

export type ToggleableType = (typeof TOGGLEABLE_TYPES)[number];

export const NOTIFY_LABELS: Record<ToggleableType, { label: string; hint: string }> = {
  COMMENT: { label: 'Bình luận bài viết', hint: 'Khi có người bình luận bài viết của bạn' },
  REPLY: { label: 'Trả lời chủ đề', hint: 'Trả lời trong chủ đề của bạn, phản hồi bình luận của bạn, và chủ đề bạn theo dõi' },
  MENTION: { label: 'Nhắc tên', hint: 'Khi có người gõ @tên bạn trong bài hoặc bình luận' },
  LIKE: { label: 'Lượt thích', hint: 'Khi có người thích bài hoặc trả lời của bạn' },
  FOLLOW: { label: 'Người theo dõi mới', hint: 'Khi có người theo dõi trang cá nhân của bạn' },
  MEDAL: { label: 'Huy hiệu', hint: 'Khi bạn đạt huy hiệu mới' },
  GUESTBOOK: { label: 'Sổ lưu bút', hint: 'Khi có người ghi vào sổ lưu bút của bạn, hoặc chủ nhà hồi âm lời nhắn của bạn' },
  FRIEND: { label: 'Kết bạn', hint: 'Khi có người mời kết bạn, hoặc lời mời của bạn được đồng ý' },
};

export function isToggleable(type: NotificationType): type is ToggleableType {
  return (TOGGLEABLE_TYPES as readonly string[]).includes(type);
}
