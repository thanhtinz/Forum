'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { gop } from '@/lib/tien-ich';

const MUC = [
  { duongDan: '/quan-tri', ten: 'Tổng quan' },
  { duongDan: '/quan-tri/game', ten: 'Game' },
  { duongDan: '/quan-tri/yeu-cau', ten: 'Yêu cầu' },
];

/**
 * Menu của khu quản trị, nằm ngay trên thanh đầu trang.
 *
 * Ba mục thì nhét thẳng lên thanh đầu, không dựng thêm một cột bên: cột bên
 * ăn mất bề ngang mà khu này toàn bảng biểu và biểu mẫu — đúng thứ cần bề
 * ngang nhất.
 *
 * "Tổng quan" phải so khớp TUYỆT ĐỐI, mấy mục kia so theo tiền tố: `/quan-tri`
 * là tiền tố của mọi đường dẫn trong khu này, nên so theo tiền tố thì nó sáng
 * ở mọi trang và chẳng còn chỉ ra được đang đứng ở đâu.
 */
export function MenuQuanTri() {
  const duongDan = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {MUC.map((m) => {
        const dangO = m.duongDan === '/quan-tri'
          ? duongDan === '/quan-tri'
          : duongDan.startsWith(m.duongDan);

        return (
          <Link key={m.duongDan} href={m.duongDan}
            aria-current={dangO ? 'page' : undefined}
            className={gop(
              'rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors',
              dangO ? 'bg-nen/20 text-nen' : 'text-nen/65 hover:bg-nen/10 hover:text-nen',
            )}>
            {m.ten}
          </Link>
        );
      })}
    </nav>
  );
}
