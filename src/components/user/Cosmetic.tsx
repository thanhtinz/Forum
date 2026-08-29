import Link from 'next/link';
import { cn, nickClass } from '@/lib/utils';
import { isGradient, NO_COSMETICS, type Cosmetics } from '@/lib/shop-const';
import { LevelBadge } from '@/components/LevelBadge';

/**
 * Tên hiển thị của một người, kèm màu tên mua ở cửa hàng.
 *
 * Thứ tự ưu tiên: màu mua > màu theo cấp do quản trị đặt > màu theo vai trò.
 * Bỏ tiền ra mua thì phải thấy được, nếu không món đồ chỉ là một dòng trong
 * kho đồ.
 */
/**
 * Tên người dùng cùng mọi thứ đứng cạnh nó, LUÔN theo một thứ tự:
 *
 *   tên → cấp độ ("Lv4") → danh hiệu → thẻ câu lạc bộ → huy hiệu nhận được
 *   → huy hiệu mua
 *
 * Danh hiệu là chữ nên đứng trước, hai huy hiệu là hình nên gom về cuối: xen
 * chữ vào giữa hai hình thì hàng trông vụn.
 *
 * Gom hết vào đây thay vì để mỗi trang tự ghép: trước kia mười một trang tự
 * dựng lấy `UserName` rồi dán thêm `LevelBadge` bên cạnh, nên thứ tự mỗi chỗ
 * một kiểu và có chỗ hiện cấp độ hai lần.
 */
export function UserName({
  username, name, role, level, look, levelColor, cosmetics = NO_COSMETICS, className, asLink = true,
}: {
  username: string | null;
  name: string | null;
  role?: string | null;
  level?: number;
  /** Cấu hình hiển thị của cấp (LevelRule): tên bậc, biểu tượng, màu. */
  look?: { name?: string | null; icon?: string | null; color?: string | null } | null;
  /** Màu theo cấp độ — dùng khi chỗ gọi chưa có `look` đầy đủ. */
  levelColor?: string | null;
  cosmetics?: Cosmetics;
  className?: string;
  asLink?: boolean;
}) {
  const label = name ?? username ?? 'Ẩn danh';
  const bought = cosmetics.nameColor;
  const mauCap = look?.color ?? levelColor;

  // Màu chuyển sắc không đặt vào `color` được: phải tô nền rồi cắt nền theo
  // hình chữ, và chữ phải trong suốt thì mới nhìn thấy nền.
  const style = bought
    ? isGradient(bought)
      ? { backgroundImage: bought, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
      : { color: bought }
    : mauCap
      ? { color: mauCap }
      : undefined;

  const cls = cn('min-w-0 truncate font-bold', !bought && !mauCap && nickClass(role), className);

  // Màu đặt thẳng lên chính thẻ mang tên (thẻ `a` khi là liên kết) chứ không
  // lồng thêm một `span` bên trong: gạch chân khi rê chuột phải cùng màu với
  // tên, và bất cứ chỗ nào đọc màu của liên kết cũng thấy đúng màu.
  return (
    // `flex-wrap`: hàng này nay có tới bốn thứ đứng sau tên (cấp, danh hiệu,
    // thẻ nhóm, huy hiệu). Không cho xuống dòng thì chính CÁI TÊN bị bóp lại
    // thành "Minh …" để nhường chỗ cho mấy cái nhãn — ngược đời, vì tên mới là
    // thứ người ta cần đọc.
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
      {asLink && username ? (
        <Link href={`/u/${username}`} className={cn(cls, 'hover:underline')} style={style}>{label}</Link>
      ) : (
        <span className={cls} style={style}>{label}</span>
      )}
      {level != null && <LevelBadge level={level} color={look?.color} name={look?.name} />}
      <CosmeticTitle cosmetics={cosmetics} />
      <CosmeticClub cosmetics={cosmetics} />
      <CosmeticMedal cosmetics={cosmetics} />
      <CosmeticBadge cosmetics={cosmetics} />
    </span>
  );
}

/**
 * Thẻ câu lạc bộ — viết tắt tên nhóm, đặt trong ngoặc vuông kiểu forum ngày
 * trước: `[HMGJ]`. Bấm vào là sang thẳng trang nhóm.
 */
export function CosmeticClub({ cosmetics, className }: { cosmetics: Cosmetics; className?: string }) {
  if (!cosmetics.clubTag) return null;
  const noiDung = <>[{cosmetics.clubTag}]</>;
  const cls = cn(
    'shrink-0 font-mono text-[11px] font-bold leading-none text-brand-600 dark:text-brand-300',
    className,
  );
  if (!cosmetics.clubSlug) return <span className={cls}>{noiDung}</span>;
  return (
    <Link href={`/clb/${cosmetics.clubSlug}`} title={cosmetics.clubName ?? undefined}
      className={cn(cls, 'hover:underline')}>
      {noiDung}
    </Link>
  );
}

/** Huy hiệu NHẬN được (huy chương) — hình nhỏ hiện cạnh tên, trước huy hiệu mua. */
export function CosmeticMedal({ cosmetics, className }: { cosmetics: Cosmetics; className?: string }) {
  if (!cosmetics.medal) return null;
  const ten = cosmetics.medalName ?? '';
  // Huy chương của quản trị có thể là emoji chứ không chỉ ảnh.
  if (!/^(https?:|\/)/.test(cosmetics.medal)) {
    return <span title={ten} className={cn('shrink-0 text-sm leading-none', className)}>{cosmetics.medal}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cosmetics.medal} alt={ten} title={ten}
      className={cn('inline-block size-4 shrink-0 object-contain', className)} />
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
 * Danh hiệu mua ở cửa hàng — dòng chữ nhỏ đứng sau cấp bậc, trước hai huy hiệu.
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
export function Avatar({ image, name, cosmetics = NO_COSMETICS, size = 40, rounded = 'rounded-full', online, className }: {
  image: string | null;
  name: string | null;
  cosmetics?: Cosmetics;
  /** Cạnh của avatar, tính bằng px. */
  size?: number;
  rounded?: string;
  /** Hiện chấm "đang trực tuyến" nằm gọn trên vành avatar. */
  online?: boolean;
  className?: string;
}) {
  const letter = (name ?? '?')[0]?.toUpperCase() ?? '?';

  /**
   * Chấm online phải nằm TRÊN VÀNH avatar, và vành ấy nằm ở đâu thì tuỳ hình.
   *
   * • Avatar TRÒN: khung bao nó là hình vuông, nên góc dưới-phải của khung nằm
   *   hẳn ngoài đường tròn — dán chấm vào góc là chấm bay lơ lửng bên ngoài.
   *   Điểm ở góc 45° của đường tròn thụt vào so với góc khung đúng
   *   `bán kính × (1 − 1/√2)`, tức `0.1464 × cạnh`.
   * • Avatar VUÔNG BO GÓC (trang cá nhân): vành gần trùng với khung bao, thụt
   *   vào chừng ấy thì chấm rơi vào giữa ảnh. Chỉ cần nhích nhẹ cho nó cắn lấy
   *   góc là vừa.
   *
   * Cỡ chấm cũng phải có TRẦN: avatar 96px mà nhân 0.3 thì ra một quả bóng 29px
   * che mất cả góc mặt.
   */
  const tron = rounded.includes('rounded-full');
  const cham = Math.min(18, Math.max(8, Math.round(size * 0.3)));
  const lech = tron
    ? Math.max(0, Math.round(size * 0.1464 - cham / 2))
    : Math.round(size * 0.04);

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


      {online && (
        <span
          className="absolute rounded-full bg-emerald-500 ring-2 ring-white dark:ring-ink-900"
          style={{ width: cham, height: cham, right: lech, bottom: lech }}
          aria-label="Đang trực tuyến"
        />
      )}
    </span>
  );
}
