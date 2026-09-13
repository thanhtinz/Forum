'use client';

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Giữ một năm: đây là thói quen, không phải một lượt ghé. */
const HAN = 60 * 60 * 24 * 365;

/**
 * Nút đổi nền sáng / tối.
 *
 * Lựa chọn ghi vào BÁNH QUY chứ không vào `localStorage`, và cũng không vào
 * cơ sở dữ liệu. Bánh quy vì máy chủ phải đọc được: nó dựng sẵn
 * `<html data-nen="toi">` ngay trong bản dựng đầu tiên, nên không có nháy
 * trắng và không lệch bản giữa máy chủ với trình duyệt — xem `dat-nen.ts` để
 * biết bản `localStorage` đã hỏng thế nào. Không vào cơ sở dữ liệu vì đây là
 * chuyện của cái máy đang cầm: cùng một người có thể muốn tối trên điện thoại
 * và sáng trên máy bàn.
 *
 * Trạng thái ban đầu do máy chủ truyền xuống, nên nút vẽ ra đúng biểu tượng
 * ngay từ khung hình đầu — không cần `useEffect` đọc lại DOM như bản trước.
 */
export function DoiNen({ banDau }: { banDau: 'sang' | 'toi' }) {
  const [toi, datToi] = useState(banDau === 'toi');

  const doi = () => {
    const toiMoi = !toi;
    document.documentElement.dataset.nen = toiMoi ? 'toi' : 'sang';
    // `SameSite=Lax` là đủ: bánh quy này không mang gì bí mật, chỉ nói người
    // dùng thích nền nào.
    document.cookie = `sunny-nen=${toiMoi ? 'toi' : 'sang'}; path=/; max-age=${HAN}; SameSite=Lax`;
    datToi(toiMoi);
  };

  return (
    <button type="button" onClick={doi} aria-label={toi ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      className="grid size-10 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-nen3 hover:text-chu">
      {toi ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
