import { PixelIcon } from '@/components/PixelIcon';
import { cn } from '@/lib/utils';

/**
 * Sao đánh giá chỉ để hiển thị (0–5, có phần lẻ).
 *
 * Bộ icon không có "nửa sao", nên dựng bằng hai lớp: năm sao mờ làm nền, rồi
 * chồng lên năm sao vàng bị cắt bớt theo đúng tỉ lệ điểm. Cắt bằng `width` +
 * `overflow-hidden` chứ không co giãn ảnh, nên sao vẫn nguyên nét.
 */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  const phanTram = Math.max(0, Math.min(1, value / 5)) * 100;
  const nam = [1, 2, 3, 4, 5];

  return (
    <span className={cn('relative inline-flex', className)}
      role="img" aria-label={`${value.toFixed(1)}/5 sao`}>
      <span className="flex text-ink-300 dark:text-ink-600" aria-hidden>
        {nam.map((i) => <PixelIcon key={i} name="sao" />)}
      </span>
      {/* Lớp vàng nằm đè lên, bị cắt còn đúng phần đã đạt. */}
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-amber-400"
        style={{ width: `${phanTram}%` }} aria-hidden>
        {nam.map((i) => <PixelIcon key={i} name="saoDay" />)}
      </span>
    </span>
  );
}
