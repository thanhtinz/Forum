import Link from 'next/link';
import { cn, nickClass } from '@/lib/utils';
import { isGradient, NO_COSMETICS, type Cosmetics } from '@/lib/shop-const';

/**
 * Tên hiển thị của một người, kèm màu tên mua ở cửa hàng.
 *
 * Thứ tự ưu tiên: màu mua > màu theo cấp do quản trị đặt > màu theo vai trò.
 * Bỏ tiền ra mua thì phải thấy được, nếu không món đồ chỉ là một dòng trong
 * kho đồ.
 */
export function UserName({ username, name, role, level, levelColor, cosmetics = NO_COSMETICS, className, asLink = true }: {
  username: string | null;
  name: string | null;
  role?: string | null;
  level?: number;
  /** Màu theo cấp độ (LevelRule) — dùng khi không đeo màu mua. */
  levelColor?: string | null;
  cosmetics?: Cosmetics;
  className?: string;
  asLink?: boolean;
}) {
  const label = name ?? username ?? 'Ẩn danh';
  const bought = cosmetics.nameColor;

  // Màu chuyển sắc không đặt vào `color` được: phải tô nền rồi cắt nền theo
  // hình chữ, và chữ phải trong suốt thì mới nhìn thấy nền.
  const style = bought
    ? isGradient(bought)
      ? { backgroundImage: bought, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
      : { color: bought }
    : levelColor
      ? { color: levelColor }
      : undefined;

  const cls = cn('min-w-0 truncate font-bold', !bought && !levelColor && nickClass(role), className);

  // Màu đặt thẳng lên chính thẻ mang tên (thẻ `a` khi là liên kết) chứ không
  // lồng thêm một `span` bên trong: gạch chân khi rê chuột phải cùng màu với
  // tên, và bất cứ chỗ nào đọc màu của liên kết cũng thấy đúng màu.
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {asLink && username ? (
        <Link href={`/u/${username}`} className={cn(cls, 'hover:underline')} style={style}>{label}</Link>
      ) : (
        <span className={cls} style={style}>{label}</span>
      )}
      <CosmeticBadge cosmetics={cosmetics} />
      <CosmeticTitle cosmetics={cosmetics} />
      {level != null && <span className="retro-sub shrink-0 text-ink-400">Lv{level}</span>}
    </span>
  );
}

/** Huy hiệu mua ở cửa hàng — ảnh nhỏ hiện ngay cạnh tên. */
export function CosmeticBadge({ cosmetics, className }: { cosmetics: Cosmetics; className?: string }) {
  if (!cosmetics.badge) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cosmetics.badge} alt={cosmetics.badgeName ?? ''} title={cosmetics.badgeName ?? undefined}
      className={cn('inline-block size-4 shrink-0 object-contain', className)} />
  );
}

/**
 * Danh hiệu mua ở cửa hàng — dòng chữ nhỏ ngay cạnh tên.
 *
 * `shrink-0` để danh hiệu không bị bóp méo khi tên dài: chỗ hẹp thì cắt bớt
 * TÊN (tên đã có `truncate`), chứ cắt danh hiệu thì ra một mẩu chữ vô nghĩa.
 */
export function CosmeticTitle({ cosmetics, className }: { cosmetics: Cosmetics; className?: string }) {
  if (!cosmetics.title) return null;
  return (
    <span className={cn('shrink-0 rounded-full bg-ink-100 px-1.5 py-px text-[11px] font-semibold text-ink-500 dark:bg-ink-800 dark:text-ink-300', className)}>
      {cosmetics.title}
    </span>
  );
}

/**
 * Avatar kèm khung mua ở cửa hàng.
 *
 * Khung là một ảnh phủ LÊN TRÊN avatar chứ không phải viền CSS, nên nó nằm ở
 * một lớp riêng có `pointer-events-none` — đè lên thì không được nuốt cú bấm
 * vào avatar bên dưới.
 */
export function Avatar({ image, name, cosmetics = NO_COSMETICS, size = 40, rounded = 'rounded-full', className }: {
  image: string | null;
  name: string | null;
  cosmetics?: Cosmetics;
  /** Cạnh của avatar, tính bằng px. */
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const letter = (name ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={cn('size-full object-cover', rounded)} />
      ) : (
        <span className={cn('grid size-full place-items-center bg-brand-500 font-black text-white', rounded)}
          style={{ fontSize: Math.round(size * 0.42) }}>
          {letter}
        </span>
      )}

      {cosmetics.avatarFrame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cosmetics.avatarFrame} alt="" aria-hidden
          className="pointer-events-none absolute -inset-[12%] size-[124%] max-w-none object-contain" />
      )}
    </span>
  );
}
