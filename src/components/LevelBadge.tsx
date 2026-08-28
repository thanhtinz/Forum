import { cn } from '@/lib/utils';
import { isImageIcon } from '@/lib/icon';

export interface LevelBadgeProps {
  level: number;
  /** Emoji hoặc đường dẫn ảnh lấy từ LevelRule. */
  icon?: string | null;
  color?: string | null;
  /** Tên cấp, dùng cho tooltip. */
  name?: string | null;
  className?: string;
}

/**
 * Huy hiệu cấp độ dùng chung cho toàn site: ưu tiên ảnh biểu tượng của cấp,
 * không có thì hiện emoji, không có nữa thì chỉ hiện "Lv{n}".
 */
export function LevelBadge({ level, icon, color, name, className }: LevelBadgeProps) {
  const img = isImageIcon(icon);
  return (
    <span
      title={name ? `Cấp ${level} · ${name}` : `Cấp ${level}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold leading-none',
        !color && 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
        className,
      )}
      style={color ? { backgroundColor: color + '26', color } : undefined}
    >
      {img
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={icon as string} alt="" className="-my-0.5 size-4 shrink-0 object-contain" />
        : icon ? <span aria-hidden>{icon}</span> : null}
      <span>Lv{level}</span>
    </span>
  );
}
