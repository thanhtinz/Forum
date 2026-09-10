'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Shield } from 'lucide-react';
import { LOI_DI, LOI_PHU, dangO } from './duong-di';
import { DauHieu } from './DauHieu';
import { gop } from '@/lib/tien-ich';
import type { NguoiDangNhap } from '@/lib/xac-thuc';

/**
 * Thanh bên trái — chỉ có từ `lg` trở lên.
 *
 * Bản web của cửa hàng ứng dụng nào cũng có một cột đứng yên bên trái, vì danh
 * sách game thì cuộn mãi không hết mà lối đi thì phải luôn trong tầm mắt.
 * Thanh ngang cũng làm được việc ấy nhưng ăn mất chiều CAO — thứ hiếm hơn
 * chiều rộng trên màn hình rộng, và cũng chính là chiều mà lưới game cần.
 *
 * Mục đang chọn tô nền bo TRÒN HẲN một đầu chứ không phải hình chữ nhật: đó là
 * dáng CH Play dùng, và nó khiến mục được chọn nổi lên mà không cần đổi màu chữ.
 */
export function ThanhBen({ nguoi }: { nguoi: NguoiDangNhap | null }) {
  const duongDan = usePathname();

  const lop = (dich: string) => gop(
    'flex items-center gap-4 rounded-r-full py-2.5 pl-5 pr-4 text-sm transition-colors',
    dangO(duongDan, dich)
      ? 'bg-nhan/12 font-bold text-nhan'
      : 'font-medium text-chu hover:bg-nen3',
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-vien bg-nen lg:flex">
      <Link href="/" className="px-5 py-4" aria-label="SunnyStore — về trang đầu">
        <DauHieu co={34} />
      </Link>

      <nav className="flex-1 space-y-1 pr-3">
        {LOI_DI.filter((l) => !l.canDangNhap || nguoi).map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.duongDan} href={l.duongDan} className={lop(l.duongDan)}>
              <Icon size={20} strokeWidth={dangO(duongDan, l.duongDan) ? 2.3 : 1.8} />
              {l.ten}
            </Link>
          );
        })}

        {/* Máy bàn có sẵn chiều cao, nên mấy lối phải rời khỏi thanh tab đáy
            của điện thoại (chỉ chứa được bốn ô) vẫn có chỗ đứng ở đây. */}
        <div className="!mt-3 pt-3">
          <div className="vach mb-3 ml-5" />
          {LOI_PHU.filter((l) => !l.canDangNhap || nguoi).map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.duongDan} href={l.duongDan} className={lop(l.duongDan)}>
                <Icon size={20} strokeWidth={dangO(duongDan, l.duongDan) ? 2.3 : 1.8} />
                {l.ten}
              </Link>
            );
          })}
          <Link href="/yeu-cau" className={lop('/yeu-cau')}>
            <Inbox size={20} strokeWidth={1.8} /> Yêu cầu game
          </Link>
          {nguoi?.vaiTro === 'QUAN_TRI' && (
            <Link href="/quan-tri" className={lop('/quan-tri')}>
              <Shield size={20} strokeWidth={1.8} /> Quản trị
            </Link>
          )}
        </div>
      </nav>

      <p className="phu px-5 py-4">© {new Date().getFullYear()} SunnyStore</p>
    </aside>
  );
}
