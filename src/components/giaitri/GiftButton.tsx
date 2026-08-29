'use client';

import { useState, useTransition } from 'react';
import { Gift } from 'lucide-react';
import { nhanQua } from '@/app/(site)/giai-tri/actions';
import { GIFT_POINTS } from '@/lib/mini-game-const';

/**
 * Nút mở hộp quà mỗi ngày.
 *
 * Bản gốc chỉ in một dòng chữ; ở đây nút tự đổi trạng thái sau khi bấm để khỏi
 * phải tải lại trang mới biết mình đã nhận chưa.
 */
export function GiftButton({ sanSang, conPhut }: { sanSang: boolean; conPhut: number }) {
  const [xong, setXong] = useState(!sanSang);
  const [nhan, setNhan] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, start] = useTransition();

  const bam = () => start(async () => {
    const r = await nhanQua();
    if (r.error) { setLoi(r.error); return; }
    setLoi(null); setXong(true); setNhan(r.ke ?? null);
  });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button type="button" onClick={bam} disabled={xong || dangChay}
        className={xong ? 'btn bg-emerald-500 text-white' : 'btn-primary'}>
        <Gift size={16} />
        {xong
          ? (nhan ? `Đã nhận +${GIFT_POINTS} điểm` : `Mai quay lại · còn ${gio(conPhut)}`)
          : dangChay ? 'Đang mở…' : `Mở hộp quà · +${GIFT_POINTS} điểm`}
      </button>
      {nhan && <span className="text-xs font-medium text-emerald-600">{nhan}</span>}
      {loi && <span className="text-xs text-red-600">{loi}</span>}
    </div>
  );
}

/** Đổi số phút còn lại thành "2 giờ 5 phút" cho dễ đọc. */
function gio(phut: number): string {
  if (phut <= 0) return 'một lát';
  const h = Math.floor(phut / 60);
  const m = phut % 60;
  return h > 0 ? `${h} giờ${m > 0 ? ` ${m} phút` : ''}` : `${m} phút`;
}
