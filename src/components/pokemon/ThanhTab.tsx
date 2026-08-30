'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Backpack, Cross, Flame, Map, Medal, ScrollText, ShoppingBasket, Store,
  Swords, Target, Trophy, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Thanh đi lại của Đảo Pokémon.
 *
 * Trước đây là một hàng nút viên thuốc xếp cạnh nhau: mười hai lối đi thì trên
 * điện thoại gãy thành năm hàng chữ vụn, mà mỗi trang con lại chỉ có đúng một
 * liên kết "quay lại" nên đi từ kho sang chợ mất hai lần chạm.
 *
 * Giờ là lưới ô vuông biểu tượng-trên-chữ-dưới, bốn cột trên điện thoại và sáu
 * cột từ máy tính bảng trở lên — mười hai ô nhìn thấy hết cùng lúc, không phải
 * cuộn ngang mò. Đặt ở layout nên trang nào cũng có, và ô của trang đang mở
 * thì sáng lên.
 */
const TAB = [
  { href: '/pokemon', ten: 'Bản đồ', Icon: Map },
  { href: '/pokemon/kho', ten: 'Kho thú', Icon: Backpack },
  { href: '/pokemon/gym', ten: 'Gym', Icon: Medal },
  { href: '/pokemon/dau-truong', ten: 'Đấu trường', Icon: Swords },
  { href: '/pokemon/lanh-tho', ten: 'Lãnh Thổ', Icon: Target },
  { href: '/pokemon/cua-hang', ten: 'Cửa hàng', Icon: Store },
  { href: '/pokemon/cuong-hoa', ten: 'Cường hoá', Icon: Flame },
  { href: '/pokemon/cho', ten: 'Chợ thú', Icon: ShoppingBasket },
  { href: '/pokemon/y-te', ten: 'Trạm y tế', Icon: Cross },
  { href: '/pokemon/bang', ten: 'Bang hội', Icon: Users },
  { href: '/pokemon/nhiem-vu', ten: 'Nhiệm vụ', Icon: ScrollText },
  { href: '/pokemon/xep-hang', ten: 'Xếp hạng', Icon: Trophy },
] as const;

export function ThanhTab({ nhan }: { nhan?: Partial<Record<string, string>> }) {
  const duong = usePathname();

  return (
    <nav aria-label="Đảo Pokémon" className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {TAB.map(({ href, ten, Icon }) => {
        // So khớp CHÍNH XÁC, không dùng `startsWith`: mọi đường dẫn con đều bắt
        // đầu bằng `/pokemon` nên ô Bản đồ sẽ sáng ở khắp mọi trang.
        const dangMo = duong === href;
        const so = nhan?.[href];
        return (
          <Link key={href} href={href}
            aria-current={dangMo ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-center transition-colors',
              dangMo
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200'
                : 'border-ink-100 text-ink-500 hover:border-brand-300 hover:text-brand-600 dark:border-ink-800',
            )}>
            <Icon size={17} className="shrink-0" />
            <span className="text-[11px] font-semibold leading-tight">{ten}</span>
            {so && (
              // Nhô hẳn ra ngoài viền và viền trắng quanh: nằm gọn bên trong
              // thì nó chen với chữ, mà ô chỉ rộng chưa tới 90 điểm ảnh.
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-ink-900">
                {so}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
