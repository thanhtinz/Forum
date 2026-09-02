'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Thanh đi lại của Vạn Đạo Tu Tiên.
 *
 * CHỈ CÓ CHỮ, không icon. Ba game kia trong khu giải trí đều gắn icon vào tab,
 * còn game này cố ý không: nó là game chữ, mà chen một hàng biểu tượng vào
 * đúng chỗ dễ thấy nhất là phá ngay cái lối ấy.
 */
const TAB = [
  { href: '/tu-tien', ten: 'Đạo Đường' },
  { href: '/tu-tien/tu-luyen', ten: 'Bế Quan' },
  { href: '/tu-tien/the-gioi', ten: 'Thế Giới' },
  { href: '/tu-tien/dao', ten: 'Đạo Phổ' },
] as const;

export function ThanhTab() {
  const duong = usePathname();
  return (
    <nav aria-label="Vạn Đạo Tu Tiên" className="tien-giay flex overflow-hidden">
      {TAB.map(({ href, ten }, i) => {
        // So khớp CHÍNH XÁC, không `startsWith`: mọi đường dẫn con đều bắt đầu
        // bằng `/tu-tien` nên ô Đạo Đường sẽ sáng ở khắp mọi trang.
        const dangMo = duong === href;
        return (
          <Link key={href} href={href}
            aria-current={dangMo ? 'page' : undefined}
            className={cn(
              'flex-1 px-3 py-2.5 text-center text-sm font-bold transition-colors',
              i > 0 && 'border-l',
              dangMo ? 'tien-son' : 'opacity-65 hover:opacity-100',
            )}
            style={{ borderColor: 'var(--tien-vien)' }}>
            {ten}
          </Link>
        );
      })}
    </nav>
  );
}
