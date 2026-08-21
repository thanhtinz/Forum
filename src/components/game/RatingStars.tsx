import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sao đánh giá chỉ để hiển thị (0–5, hỗ trợ nửa sao bằng cách tô nền). */
export function RatingStars({ value, size = 13, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value}/5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.min(1, Math.max(0, value - i + 1));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-ink-300 dark:text-ink-600" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-amber-400" fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
