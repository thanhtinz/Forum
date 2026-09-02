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
 *
 * Thứ tự bốn ô theo đúng blueprint mục 2 (Trang chính · Tu luyện · Đạo · Thế
 * giới); "Xã hội" chưa có gì nên chưa dựng ô. Blueprint vẽ thanh này DÍNH ĐÁY
 * màn hình, ở đây vẫn để trên đầu trang: diễn đàn đã có thanh đáy của riêng
 * nó, chồng hai thanh lên nhau thì mất luôn vùng ngón cái mà blueprint muốn
 * giữ cho nút hành động chính.
 */
const TAB = [
  { href: '/tu-tien', ten: 'Đạo Đường' },
  { href: '/tu-tien/tu-luyen', ten: 'Bế Quan' },
  { href: '/tu-tien/dao', ten: 'Đạo Phổ' },
  { href: '/tu-tien/the-gioi', ten: 'Thế Giới' },
] as const;

export function ThanhTab() {
  const duong = usePathname();
  return (
    <nav aria-label="Vạn Đạo Tu Tiên" className="tien-tam flex overflow-hidden">
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
              dangMo ? 'tien-dao-mau' : 'opacity-65 hover:opacity-100',
            )}
            style={{
              borderColor: 'var(--tien-vien)',
              // Gạch chân theo accent của đạo: chỉ đổi màu chữ thôi thì trên
              // nền mực đen mấy ô nhìn na ná nhau.
              boxShadow: dangMo ? 'inset 0 -2px 0 var(--tien-dao)' : undefined,
            }}>
            {ten}
          </Link>
        );
      })}
    </nav>
  );
}
