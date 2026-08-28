import { RetroIcon } from '@/components/RetroIcon';
import type { RetroIconName } from '@/lib/retro-icons';
import { cn } from '@/lib/utils';

/**
 * Sao đánh giá chỉ để hiển thị (0–5, có nửa sao).
 *
 * Dùng thẳng dải sao của bộ icon wap ngày trước: mỗi mức nửa sao là một ảnh
 * riêng (`star.0`, `star.0-5`, … `star.5`), nên chỉ việc làm tròn về nửa sao
 * gần nhất — không phải chồng hai lớp sao rồi cắt theo phần trăm như trước.
 *
 * Dải gốc rộng 65×12. Chỉ phóng theo bội số nguyên: đặt chiều cao lẻ (11, 13…)
 * là điểm ảnh rơi vào ranh giới màn hình và cả dải sao mờ đi.
 */
export function RatingStars({ value, scale = 1, className }: {
  value: number;
  scale?: 1 | 2;
  className?: string;
}) {
  const muc = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  const ten = (Number.isInteger(muc) ? `rating/star.${muc}` : `rating/star.${Math.floor(muc)}-5`) as RetroIconName;

  return (
    <span className={cn('inline-flex items-center', className)}>
      <RetroIcon name={ten} alt={`${value.toFixed(1)}/5 sao`} scale={scale} />
    </span>
  );
}
