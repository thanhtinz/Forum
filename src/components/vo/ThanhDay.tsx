'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOI_DI, dangO } from './duong-di';
import { gop } from '@/lib/tien-ich';

/**
 * Thanh tab đáy — chỉ có trên điện thoại.
 *
 * NỔI LÊN VÀ BO TRÒN, không dính sát mép dưới.
 *
 * Đây là dáng của một ứng dụng cài trên máy chứ không phải của một trang web:
 * thanh trôi trên nền, có bóng đổ, bo tròn cả bốn góc. Khi trang này được cài
 * thành ứng dụng (PWA) thì nó chạy toàn màn hình, không còn thanh địa chỉ của
 * trình duyệt — lúc ấy một thanh dính đáy trông y hệt một trang web bị nhét
 * vào khung ứng dụng, còn thanh nổi thì trông như thứ vốn thuộc về máy.
 *
 * `env(safe-area-inset-bottom)` cộng thêm vào lề dưới để thanh nằm TRÊN vạch
 * gạt của iPhone, không bị nó đè lên.
 */
export function ThanhDay() {
  const duongDan = usePathname();

  return (
    <nav aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <ul className="kinh mx-auto flex max-w-md rounded-[26px] p-1.5">
        {LOI_DI.map((l) => {
          const Icon = l.icon;
          const chon = dangO(duongDan, l.duongDan);
          return (
            <li key={l.duongDan} className="flex-1">
              <Link href={l.duongDan} aria-current={chon ? 'page' : undefined}
                className={gop(
                  'flex flex-col items-center gap-0.5 rounded-[20px] py-1.5 transition-colors',
                  chon ? 'bg-nhan/12' : '',
                )}>
                <Icon size={20} strokeWidth={chon ? 2.4 : 1.8}
                  className={chon ? 'text-nhan' : 'text-mo'} aria-hidden />
                <span className={gop('text-[10px] leading-none',
                  chon ? 'font-bold text-nhan' : 'font-medium text-mo')}>
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
