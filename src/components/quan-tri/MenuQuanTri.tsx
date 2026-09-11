'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOI_QUAN_TRI, dangOQuanTri, type MaDem } from '@/lib/quan-tri-loi-di';
import { gop } from '@/lib/tien-ich';

/**
 * Menu ngang của khu quản trị — chỉ dùng ở khổ nhỏ, nơi không có thanh bên.
 *
 * Cuộn ngang được, vì năm mục tiếng Việt không vừa bề ngang điện thoại. Bỏ
 * tiêu đề nhóm ở đây: hàng ngang không có chỗ cho nó, mà năm mục thì mắt vẫn
 * quét hết được trong một nhịp.
 */
export function MenuQuanTri({ dem }: { dem: Record<MaDem, number> }) {
  const duongDan = usePathname();

  return (
    <div className="ke gap-1 px-4 pb-2.5">
      {LOI_QUAN_TRI.map((l) => {
        const mo = dangOQuanTri(duongDan, l.duongDan);
        const so = l.demCho ? dem[l.demCho] : 0;

        return (
          <Link key={l.duongDan} href={l.duongDan} aria-current={mo ? 'page' : undefined}
            className={gop(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors',
              mo ? 'bg-nen/20 text-nen' : 'text-nen/60 hover:bg-nen/10 hover:text-nen',
            )}>
            {l.ten}
            {so > 0 && (
              <span className="rounded-full bg-cam px-1.5 text-[10px] font-bold leading-[15px] text-chu">
                {so > 99 ? '99+' : so}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
