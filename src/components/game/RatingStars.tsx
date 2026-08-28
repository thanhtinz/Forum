import { cn } from '@/lib/utils';

/**
 * Sao đánh giá chỉ để hiển thị (0–5, có nửa sao).
 *
 * Dùng thẳng dải sao của bộ icon wap ngày trước: mỗi mức nửa sao là một ảnh
 * riêng (`star.0`, `star.0-5`, … `star.5`), nên không phải chồng hai lớp sao
 * rồi cắt theo phần trăm như trước — làm tròn về nửa sao gần nhất là xong.
 */
export function RatingStars({ value, size = 13, className }: { value: number; size?: number; className?: string }) {
  const muc = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  const ten = Number.isInteger(muc) ? String(muc) : `${Math.floor(muc)}-5`;
  // Dải gốc rộng 65px cho 5 sao; giữ đúng tỷ lệ ấy theo chiều cao mong muốn.
  const rong = Math.round((size * 65) / 12);

  return (
    <span className={cn('inline-flex items-center', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/retro/rating/star.${ten}.gif`}
        alt={`${value.toFixed(1)}/5 sao`}
        width={rong}
        height={size}
        style={{ imageRendering: 'pixelated', width: rong, height: size }}
      />
    </span>
  );
}
