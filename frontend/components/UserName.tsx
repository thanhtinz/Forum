'use client';

import { cssToStyle } from '@/lib/nameEffect';

// Hiển thị tên người dùng kèm hiệu ứng tên (CSS) + badge cửa hàng (ảnh) nếu có.
export function UserName({
  user,
  className = '',
  badgeSize = 18,
}: {
  user: { displayName?: string | null; username?: string | null; nameEffectCss?: string | null; shopBadgeUrl?: string | null };
  className?: string;
  badgeSize?: number;
}) {
  const name = user.displayName || user.username || '';
  const style = cssToStyle(user.nameEffectCss);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span style={style}>{name}</span>
      {user.shopBadgeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.shopBadgeUrl} alt="" className="inline-block shrink-0 object-contain" style={{ height: badgeSize, width: badgeSize }} />
      )}
    </span>
  );
}

export default UserName;
