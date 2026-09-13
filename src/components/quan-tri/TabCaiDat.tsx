'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, HardDrive, Mail } from 'lucide-react';
import { gop } from '@/lib/tien-ich';

const TAB = [
  { dich: '/quan-tri/cai-dat', ten: 'Thông tin trang', hinh: Globe },
  { dich: '/quan-tri/cai-dat/thu', ten: 'Gửi thư', hinh: Mail },
  { dich: '/quan-tri/cai-dat/kho', ten: 'Kho tệp', hinh: HardDrive },
] as const;

/**
 * Hàng tab của khu cài đặt.
 *
 * Là `<Link>` thật sang ba địa chỉ, không phải nút đổi trạng thái trong một
 * trang: dán được địa chỉ đúng tab cho người khác, nút Lùi quay về đúng tab
 * vừa xem, và mỗi tab tự dựng phần của nó ở máy chủ — cấu hình thư thì không
 * việc gì phải tải theo khi người ta chỉ vào sửa tên cửa hàng.
 */
export function TabCaiDat() {
  const dangO = usePathname();

  return (
    <nav className="vach flex gap-1 overflow-x-auto border-b" aria-label="Nhóm cài đặt">
      {TAB.map((t) => {
        // Tab đầu là đường dẫn gốc nên phải so khớp tuyệt đối; hai tab kia mà
        // so kiểu "bắt đầu bằng" thì tab gốc sáng ở mọi trang.
        const chon = t.dich === '/quan-tri/cai-dat'
          ? dangO === t.dich
          : dangO.startsWith(t.dich);
        return (
          <Link key={t.dich} href={t.dich} aria-current={chon ? 'page' : undefined}
            className={gop(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-[14px] transition-colors',
              chon ? 'border-nhan font-bold text-nhan' : 'border-transparent font-medium text-mo hover:text-chu',
            )}>
            <t.hinh size={15} aria-hidden />
            {t.ten}
          </Link>
        );
      })}
    </nav>
  );
}
