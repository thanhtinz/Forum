'use client';

import { useState, useTransition } from 'react';
import { traLoiYeuCau } from '@/app/quan-tri/viec';

const TRANG_THAI = [
  { ma: 'CHO_XEM', ten: 'Chờ xem' },
  { ma: 'DANG_TIM', ten: 'Đang tìm' },
  { ma: 'DA_THEM', ten: 'Đã thêm' },
  { ma: 'TU_CHOI', ten: 'Không tìm được' },
];

/**
 * Ô trả lời một yêu cầu game.
 *
 * Lời nhắn hiện CÔNG KHAI ở trang yêu cầu, nên nhắc thẳng điều đó ngay dưới ô
 * nhập — không thì người trực dễ gõ một câu ghi chú nội bộ vào đây.
 */
export function OTraLoiYeuCau({ id, trangThai, loiNhan }: {
  id: string; trangThai: string; loiNhan: string;
}) {
  const [tt, datTt] = useState(trangThai);
  const [chu, datChu] = useState(loiNhan);
  const [xong, datXong] = useState(false);
  const [dangLuu, batDau] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={tt} onChange={(e) => { datTt(e.target.value); datXong(false); }}
          aria-label="Trạng thái yêu cầu" className="o-nhap !w-auto !py-2 !text-[13px]">
          {TRANG_THAI.map((t) => <option key={t.ma} value={t.ma}>{t.ten}</option>)}
        </select>
        <button type="button" disabled={dangLuu}
          onClick={() => batDau(async () => { await traLoiYeuCau(id, tt, chu); datXong(true); })}
          className="nut-xam !min-h-[38px]">
          {dangLuu ? 'Đang lưu…' : 'Lưu'}
        </button>
        {xong && <span className="self-center text-[13px] font-semibold text-nhan">Đã lưu</span>}
      </div>
      <textarea value={chu} onChange={(e) => { datChu(e.target.value); datXong(false); }}
        rows={2} maxLength={500} placeholder="Lời nhắn gửi người yêu cầu…" className="o-nhap !text-[13px]" />
      <p className="phu">Lời nhắn này hiện công khai ở trang Yêu cầu game.</p>
    </div>
  );
}
