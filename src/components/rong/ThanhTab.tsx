'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Egg, Home, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Thanh đi lại của Đảo Rồng.
 *
 * Trước đây cả trò nằm gọn trong MỘT trang: chuồng, đấu trường và bộ sưu tập
 * xếp chồng nhau trong ba khối `card`, cuộn hết trang mới thấy con rồng thứ
 * sáu. Nay tách thành sáu lối đi, và thanh này đặt ở khung nên trang nào cũng
 * có — không phải quay ngược về trang chính rồi mới đi tiếp.
 *
 * Cửa hàng và xếp hạng sẽ thêm vào đây khi hai trang ấy dựng xong; thêm ô dẫn
 * tới trang chưa có thì người bấm vào chỉ gặp một trang trống.
 */
const TAB = [
  { href: '/rong', ten: 'Chuồng', Icon: Home },
  { href: '/rong/ap-trung', ten: 'Ấp trứng', Icon: Egg },
  { href: '/rong/dau-truong', ten: 'Đấu trường', Icon: Swords },
  { href: '/rong/so-suu-tam', ten: 'Sổ sưu tầm', Icon: BookOpen },
] as const;

export function ThanhTab({ nhan }: { nhan?: Partial<Record<string, string>> }) {
  const duong = usePathname();

  return (
    <nav aria-label="Đảo Rồng"
      className="rong-tam grid grid-cols-4 gap-1.5 p-1.5">
      {TAB.map(({ href, ten, Icon }) => {
        // So khớp CHÍNH XÁC, không dùng `startsWith`: mọi đường dẫn con đều bắt
        // đầu bằng `/rong` nên ô Chuồng sẽ sáng ở khắp mọi trang.
        const dangMo = duong === href;
        const so = nhan?.[href];
        return (
          <Link key={href} href={href}
            aria-current={dangMo ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors',
              dangMo
                ? 'rong-nen-nhan font-bold shadow-inner'
                : 'text-ink-500 hover:bg-black/5 dark:text-ink-400 dark:hover:bg-white/5',
            )}>
            <Icon size={17} className={cn('shrink-0', dangMo && 'rong-nhan')} />
            <span className="text-[11px] font-semibold leading-tight">{ten}</span>
            {so && (
              // Nhô hẳn ra ngoài viền: nằm gọn bên trong thì nó chen với chữ,
              // mà ô chỉ rộng chưa tới 90 điểm ảnh.
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
