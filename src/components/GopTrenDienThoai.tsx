import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Khối gấp lại trên điện thoại, mở sẵn từ `sm` trở lên.
 *
 * Trên máy tính mấy khối tra cứu (điều khiển, lịch sử phiên bản, phân loại…)
 * nằm cạnh nhau hoặc trong cột hẹp nên chẳng tốn mấy chiều cao. Xuống điện
 * thoại thì chúng xếp dọc, mỗi khối ăn vài trăm pixel, và người ta phải cuộn
 * qua hết mới tới được thứ mình vào để xem. Gấp lại thì cuộn một nhịp là qua,
 * ai cần vẫn mở ra được — không cắt mất thứ gì.
 *
 * Dùng `<details>` chứ không phải state của React: gấp/mở là việc trình duyệt
 * làm sẵn, có bàn phím và trình đọc màn hình đi kèm, và không bắt trang phải
 * thành client component.
 *
 * Từ `sm` trở lên: phần thân bị ép hiện ra, còn thanh tiêu đề thôi bấm được và
 * mũi tên biến mất — nên trông đúng như một tiêu đề mục bình thường. Tiêu đề
 * KHÔNG bị giấu đi, trừ khi `anTuSm` (dùng khi bên trong đã có sẵn tiêu đề
 * riêng của từng mục con, thêm một cái nữa là thừa).
 */
export function GopTrenDienThoai({
  tieuDe, icon, className, lopTieuDe = 'zib-title', anTuSm = false, children,
}: {
  tieuDe: string;
  icon?: React.ReactNode;
  className?: string;
  /** Lớp cho thanh tiêu đề — đặt lại để khớp kiểu tiêu đề của chỗ dùng. */
  lopTieuDe?: string;
  /** Giấu hẳn thanh tiêu đề từ `sm` — cho khối mà bên trong đã có tiêu đề. */
  anTuSm?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={cn('gop-dt group', anTuSm && 'gop-dt-an', className)} >
      <summary className={cn('flex cursor-pointer list-none items-center gap-2', lopTieuDe)}>
        {icon}
        <span className="flex-1">{tieuDe}</span>
        <ChevronDown
          size={18}
          aria-hidden
          className="gop-dt-mui shrink-0 text-ink-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <div className="gop-dt-than mt-3">{children}</div>
    </details>
  );
}
