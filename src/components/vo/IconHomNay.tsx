import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * Biểu tượng tab "Hôm nay" — tấm thẻ có chữ ở trên và ảnh ở dưới.
 *
 * Vì sao tự vẽ thay vì lấy trong bộ lucide: không cái nào trong bộ ấy nói đúng
 * điều cần nói. Trước đây dùng `Sparkles`, mà mấy tia lấp lánh nghĩa là "phép
 * màu, tự động, AI" — chẳng liên quan gì tới một trang biên tập. Tab này bày
 * mỗi ngày vài tấm thẻ, mỗi tấm một đoạn giới thiệu và một khối hình, nên hình
 * đúng của nó chính là hình một tấm thẻ như thế.
 *
 * Vẽ theo đúng quy ước của lucide — khung 24×24, nét 2, đầu nét bo tròn, màu
 * lấy từ `currentColor` — để nó đứng cạnh ba icon kia mà không lệch một nhịp
 * nào. Khối dưới tô ĐẶC: đó là phần ảnh của tấm thẻ, mà một khung rỗng nữa
 * nằm trong khung rỗng thì ở cỡ 22px chỉ còn là một mớ vạch.
 */
export const IconHomNay = forwardRef<SVGSVGElement, LucideProps>(
  function IconHomNay({ size = 24, strokeWidth = 2, absoluteStrokeWidth, ...con }, ref) {
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg"
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        // `absoluteStrokeWidth` của lucide: giữ nét dày thật khi phóng to icon.
        strokeWidth={absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" {...con}>
        <rect x="3" y="2" width="18" height="20" rx="4" />
        <path d="M7.5 6.5h9" />
        <path d="M7.5 9.5h5" />
        <rect x="7.5" y="12.5" width="9" height="6" rx="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  },
);
