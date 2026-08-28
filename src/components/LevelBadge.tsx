import { cn } from '@/lib/utils';
import { isImageIcon } from '@/lib/icon';

export interface LevelBadgeProps {
  level: number;
  color?: string | null;
  /** Tên cấp, dùng cho tooltip. */
  name?: string | null;
  className?: string;
}

/** Nền và chữ chung cho cả hai khung, để chúng đứng cạnh nhau thì bằng nhau. */
const KHUNG = 'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold leading-none';
const MAU_MAC_DINH = 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300';

/**
 * Khung CẤP ĐỘ: chỉ con số, "Lv4".
 *
 * Cấp độ và cấp bậc là hai thứ khác nhau nên là hai khung riêng đứng cạnh
 * nhau: cấp độ là con số tự lên theo điểm kinh nghiệm, còn cấp bậc là cái tên
 * và biểu tượng quản trị đặt cho khoảng cấp ấy. Gộp làm một thì đổi tên bậc là
 * mất luôn con số.
 */
export function LevelBadge({ level, color, name, className }: LevelBadgeProps) {
  return (
    <span
      title={name ? `Cấp ${level} · ${name}` : `Cấp ${level}`}
      className={cn(KHUNG, !color && MAU_MAC_DINH, className)}
      style={color ? { backgroundColor: color + '26', color } : undefined}
    >
      Lv{level}
    </span>
  );
}

/**
 * Khung CẤP BẬC (rank): biểu tượng quản trị đặt cho cấp, đứng ngay cạnh khung
 * cấp độ. Cấp nào chưa đặt biểu tượng thì không hiện gì cả.
 */
export function RankBadge({ icon, color, name, className }: {
  /** Emoji hoặc đường dẫn ảnh lấy từ LevelRule. */
  icon?: string | null;
  color?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (!icon) return null;
  return (
    <span
      title={name ?? undefined}
      className={cn(KHUNG, !color && MAU_MAC_DINH, className)}
      style={color ? { backgroundColor: color + '26', color } : undefined}
    >
      {isImageIcon(icon)
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={icon} alt={name ?? ''} className="-my-0.5 size-4 shrink-0 object-contain" />
        : <span aria-hidden>{icon}</span>}
    </span>
  );
}
