import { ChevronDown } from 'lucide-react';
import { gop } from '@/lib/tien-ich';

/**
 * Một khối gấp lại được, mở ra bằng cách bấm vào đầu đề.
 *
 * Dựng bằng <details>/<summary> của chính HTML, không phải bằng React state.
 * Ba cái lợi, và cả ba đều thật:
 *   • chạy trước khi JavaScript kịp tải — bấm vào là mở, không phải chờ;
 *   • bàn phím và bộ đọc màn hình hiểu sẵn, khỏi phải tự dựng aria-expanded;
 *   • Ctrl+F của trình duyệt tìm được cả chữ đang gấp bên trong.
 *
 * Dùng cho những thứ CẦN CÓ nhưng không phải ai cũng cần đọc: mã kiểm tra,
 * cách cài trên từng hệ, lưu ý tương thích. CH Play gấp mục "an toàn dữ liệu"
 * đúng như vậy — có mặt, nhưng không giành chỗ của nút cài.
 */
export function KhoiGap({ tieuDe, tomTat, icon, children, className }: {
  tieuDe: string;
  /** Một dòng nói trước nội dung bên trong, để người đọc quyết định có mở không. */
  tomTat?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={gop('the group overflow-hidden', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3">
        {icon && <span className="shrink-0 text-mo">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">{tieuDe}</span>
          {tomTat && <span className="phu mt-0.5 block">{tomTat}</span>}
        </span>
        <ChevronDown size={16} aria-hidden
          className="shrink-0 text-mo transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-vien px-4 py-3">{children}</div>
    </details>
  );
}
