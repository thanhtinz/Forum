'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOI_DI, dangO } from './duong-di';
import { gop } from '@/lib/tien-ich';

/**
 * Thanh tab dưới đáy — chỉ có trên điện thoại.
 *
 * Ngón cái cầm điện thoại một tay với tới vùng đáy chứ không với tới đỉnh màn
 * hình, nên lối đi chính nằm ở đáy — cả hai cửa hàng lớn đều đặt ở đây.
 *
 * Mục đang chọn tô một viên thuốc sau biểu tượng (dáng Material 3 của CH Play)
 * thay vì chỉ đổi màu: đổi màu không thôi thì người mù màu không thấy gì.
 */
export function ThanhDay({ daDangNhap }: { daDangNhap: boolean }) {
  const duongDan = usePathname();
  const muc = LOI_DI.filter((l) => !l.canDangNhap || daDangNhap);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-vien bg-nen2 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="flex">
        {muc.map((l) => {
          const Icon = l.icon;
          const chon = dangO(duongDan, l.duongDan);
          return (
            <li key={l.duongDan} className="flex-1">
              <Link href={l.duongDan} className="flex flex-col items-center gap-1 py-1.5">
                <span className={gop(
                  'grid h-7 w-16 place-items-center rounded-full transition-colors',
                  chon ? 'bg-nhan/15' : '',
                )}>
                  <Icon size={20} strokeWidth={chon ? 2.4 : 1.8} className={chon ? 'text-nhan' : 'text-mo'} />
                </span>
                <span className={gop('text-[10px]', chon ? 'font-bold text-nhan' : 'font-medium text-mo')}>
                  {l.ten}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
