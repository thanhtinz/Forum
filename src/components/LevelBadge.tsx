import { cn } from '@/lib/utils';

export interface LevelBadgeProps {
  level: number;
  color?: string | null;
  /** Tên bậc, dùng cho tooltip. */
  name?: string | null;
  className?: string;
}

/**
 * Khung cấp độ: chỉ con số, "Lv4".
 *
 * Trước đây cạnh nó còn một khung nữa mang biểu tượng của bậc. Hai khung liền
 * nhau chỉ để nói cùng một chuyện thì rườm; nay tên bậc đứng ra làm DANH HIỆU
 * (xem `UserName`), còn biểu tượng thì bỏ hẳn.
 */
export function LevelBadge({ level, color, name, className }: LevelBadgeProps) {
  return (
    <span
      title={name ? `Cấp ${level} · ${name}` : `Cấp ${level}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-bold leading-none',
        !color && 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
        className,
      )}
      style={color ? { backgroundColor: color + '26', color } : undefined}
    >
      Lv{level}
    </span>
  );
}
