'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KHOA = 'nova:nen';

/**
 * Nút đổi nền sáng / tối.
 *
 * Lựa chọn ghi vào `localStorage` chứ không vào CSDL: nó là chuyện của cái máy
 * đang cầm, không phải của tài khoản — cùng một người có thể muốn tối trên
 * điện thoại và sáng trên máy bàn.
 *
 * Việc đặt nền LÚC TẢI TRANG do đoạn mã nhỏ trong `layout.tsx` lo, chạy trước
 * cả React. Ở đây chỉ đọc lại xem đang là gì để vẽ đúng biểu tượng.
 */
export function DoiNen() {
  const [toi, datToi] = useState(false);

  useEffect(() => {
    datToi(document.documentElement.dataset.nen === 'toi');
  }, []);

  const doi = () => {
    const toiMoi = !toi;
    document.documentElement.dataset.nen = toiMoi ? 'toi' : 'sang';
    try { localStorage.setItem(KHOA, toiMoi ? 'toi' : 'sang'); } catch { /* chế độ riêng tư chặn ghi */ }
    datToi(toiMoi);
  };

  return (
    <button type="button" onClick={doi} aria-label={toi ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      className="grid size-10 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-nen3 hover:text-chu">
      {toi ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
