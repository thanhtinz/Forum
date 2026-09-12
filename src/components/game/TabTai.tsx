'use client';

import { useState } from 'react';
import { gop } from '@/lib/tien-ich';

/**
 * HAI TAB CỦA TRANG TẢI: đang tải và đã tải.
 *
 * Tab đổi bằng trạng thái chứ không bằng địa chỉ — khác hẳn hai tab ở trang
 * game. Ở đây tab "Đang tải" đang giữ một lượt tải THẬT chảy trong bộ nhớ
 * trang; sang tab kia bằng một lần đi địa chỉ mới là dựng lại cả trang, tức là
 * giết luôn lượt tải ấy giữa chừng.
 */
export function TabTai({ dangTai, daTai, soDaTai }: {
  dangTai: React.ReactNode;
  daTai: React.ReactNode;
  soDaTai: number;
}) {
  const [tab, datTab] = useState<'dang' | 'da'>('dang');

  return (
    <div className="space-y-4">
      {/*
        Hai nút nằm trong một rãnh xám, con chạy trắng trượt dưới nút đang
        chọn — đúng dáng cặp tab của App Store. Là `button` thật trong một
        nhóm có nhãn, không phải mấy cái `div` nghe sự kiện chuột: bàn phím
        phải Tab tới được và bộ đọc màn hình phải đọc ra "đã chọn".
      */}
      <div role="tablist" aria-label="Lượt tải" className="flex gap-1 rounded-full bg-nen3 p-1">
        {([['dang', 'Đang tải'], ['da', `Đã tải${soDaTai > 0 ? ` · ${soDaTai}` : ''}`]] as const)
          .map(([ma, ten]) => (
            <button key={ma} type="button" role="tab" aria-selected={tab === ma}
              onClick={() => datTab(ma)}
              className={gop(
                'flex-1 rounded-full py-2 text-[14px] transition-colors',
                tab === ma ? 'bg-nen2 font-bold shadow-noi' : 'font-medium text-mo hover:text-chu',
              )}>
              {ten}
            </button>
          ))}
      </div>

      {/*
        Tab không xem tới thì GIẤU ĐI, không tháo ra.

        Tháo ra thì lượt tải trong tab "Đang tải" chết theo — mà người bấm
        sang tab kia chỉ định ngó một cái rồi quay lại. `hidden` giữ nguyên
        mọi thứ đang chạy, và bộ đọc màn hình cũng bỏ qua đúng phần đang ẩn.
      */}
      <div role="tabpanel" hidden={tab !== 'dang'}>{dangTai}</div>
      <div role="tabpanel" hidden={tab !== 'da'}>{daTai}</div>
    </div>
  );
}
