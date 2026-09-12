'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Thanh trên của bảng tác giả, chỉ hiện ở khổ hẹp.
 *
 * Ở khổ rộng thanh bên đã bày đủ lối đi, nên thanh này ẩn hẳn — hai chỗ cùng
 * liệt kê một danh sách thì người dùng phải tự hỏi hai chỗ ấy khác nhau ở đâu.
 */
export function MenuTacGia({ loiDi, ten }: {
  loiDi: { dich: string; ten: string }[];
  ten: string;
}) {
  const [mo, datMo] = useState(false);

  return (
    <header className="kinh-tren sticky top-0 z-30 lg:hidden">
      <div className="khung flex items-center justify-between gap-3 py-2.5">
        <Link href="/quan-ly" className="text-[15px] font-bold tracking-tight">
          SunnyStore <span className="font-medium text-mo">Tác giả</span>
        </Link>
        <button type="button" onClick={() => datMo((v) => !v)}
          aria-label={mo ? 'Đóng menu' : 'Mở menu'} aria-expanded={mo} className="nut-tron">
          {mo ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mo && (
        <nav className="khung pb-3">
          {loiDi.map((l) => (
            <Link key={l.dich} href={l.dich} onClick={() => datMo(false)}
              className="block rounded-nut px-2.5 py-2 text-[14px] font-medium text-mo hover:bg-nen3 hover:text-chu">
              {l.ten}
            </Link>
          ))}
          <p className="phu mt-2 px-2.5">{ten}</p>
        </nav>
      )}
    </header>
  );
}
