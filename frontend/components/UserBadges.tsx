'use client';

// Hệ thống huy hiệu hiển thị cạnh tên/avatar người dùng.
// - Badge vai trò: Quản trị / Điều hành / VIP / Thành viên
// - Badge verify: Đã xác minh (admin cấp)
// - Badge người bán: Người bán / Người bán uy tín
// - Badge mục tiêu: thành tựu tự trao theo cột mốc
//
// Có 2 cách dùng:
//   <UserBadges badges={descriptorsTừAPI} />              // đầy đủ (trang hồ sơ)
//   <UserBadges user={{role, verifiedBadge, isSeller}} /> // suy ra nhanh (cạnh bài viết)

export type BadgeColor = 'red' | 'blue' | 'amber' | 'green' | 'gray' | 'violet';
export type BadgeKind = 'role' | 'verify' | 'seller' | 'milestone';

export interface BadgeDescriptor {
  key: string;
  label: string;
  icon: string;
  color: BadgeColor;
  kind: BadgeKind;
  description?: string;
}

const COLOR_CLASS: Record<BadgeColor, string> = {
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  gray: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

// Suy ra badge vai trò/verify/seller từ các trường có sẵn trên object user
// (dùng cho danh sách bài viết, tránh gọi API riêng cho từng người).
export function roleBadgesFromUser(u: {
  role?: string | null;
  verifiedBadge?: boolean | null;
  isSeller?: boolean | null;
  sellerVerified?: boolean | null;
}): BadgeDescriptor[] {
  const out: BadgeDescriptor[] = [];
  if (u.verifiedBadge) out.push({ key: 'verify', label: 'Đã xác minh', icon: '✔️', color: 'blue', kind: 'verify' });
  switch (u.role) {
    case 'ADMIN': out.push({ key: 'role:ADMIN', label: 'Quản trị viên', icon: '🛡️', color: 'red', kind: 'role' }); break;
    case 'MODERATOR': out.push({ key: 'role:MOD', label: 'Điều hành viên', icon: '🛠️', color: 'violet', kind: 'role' }); break;
    case 'VIP': out.push({ key: 'role:VIP', label: 'VIP', icon: '⭐', color: 'amber', kind: 'role' }); break;
    case 'MEMBER': out.push({ key: 'role:MEMBER', label: 'Thành viên', icon: '👤', color: 'gray', kind: 'role' }); break;
  }
  if (u.isSeller) out.push({ key: 'seller', label: u.sellerVerified ? 'Người bán uy tín' : 'Người bán', icon: '🏪', color: 'green', kind: 'seller' });
  return out;
}

export function UserBadges({
  badges,
  user,
  size = 'sm',
  iconOnly = false,
  max,
  className = '',
}: {
  badges?: BadgeDescriptor[];
  user?: Parameters<typeof roleBadgesFromUser>[0];
  size?: 'xs' | 'sm';
  iconOnly?: boolean;
  max?: number;
  className?: string;
}) {
  let list = badges ?? (user ? roleBadgesFromUser(user) : []);
  if (!list.length) return null;
  if (max && list.length > max) list = list.slice(0, max);

  const pad = size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {list.map((b) => (
        <span
          key={b.key}
          title={b.description ? `${b.label} — ${b.description}` : b.label}
          className={`inline-flex items-center gap-1 rounded-full font-medium ${pad} ${COLOR_CLASS[b.color] || COLOR_CLASS.gray}`}
        >
          <span aria-hidden>{b.icon}</span>
          {!iconOnly && <span>{b.label}</span>}
        </span>
      ))}
    </span>
  );
}

export default UserBadges;
