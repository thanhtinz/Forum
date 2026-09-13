'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { bamHuuIch } from '@/app/(cua-hang)/game/[duongDan]/viec';
import { gop } from '@/lib/tien-ich';

/**
 * Nút "Hữu ích" dưới mỗi bài đánh giá.
 *
 * VÌ SAO CÓ: phần đánh giá sắp mặc định theo "hữu ích nhất", mà cách sắp ấy
 * chỉ có nghĩa khi có người bấm. Không có nút thì cột `soHuuIch` mãi bằng 0 và
 * "hữu ích nhất" rút lại thành "mới nhất" trá hình.
 *
 * Con số đổi NGAY trên màn hình rồi mới gửi lên, và trả về đúng số máy chủ
 * đếm được. Đợi máy chủ mới đổi thì trên đường truyền chập chờn — đúng loại
 * máy hay mở cửa hàng này — người ta bấm ba lần vì tưởng nút hỏng.
 *
 * Ai chưa đăng nhập hoặc đang đọc bài của chính mình thì chỉ THẤY con số, nút
 * không bấm được: bấm xong mới bị máy chủ chối là một cú bấm phí.
 */
export function NutHuuIch({ danhGiaId, dem, banDauBam, bamDuoc }: {
  danhGiaId: string;
  dem: number;
  banDauBam: boolean;
  bamDuoc: boolean;
}) {
  const [so, datSo] = useState(dem);
  const [daBam, datDaBam] = useState(banDauBam);
  const [dangGui, batDau] = useTransition();

  const nhan = so > 0 ? `Hữu ích (${so})` : 'Hữu ích';

  if (!bamDuoc) {
    // Chưa ai bấm mà lại không bấm được thì cả dòng chỉ là chữ thừa — ẩn hẳn.
    if (so === 0) return null;
    return <span className="phu inline-flex items-center gap-1.5"><ThumbsUp size={13} aria-hidden />{so} thấy hữu ích</span>;
  }

  const bam = () => {
    const truoc = { so, daBam };
    datSo(daBam ? Math.max(0, so - 1) : so + 1);
    datDaBam(!daBam);
    batDau(async () => {
      const r = await bamHuuIch(danhGiaId);
      // Hỏng thì trả về đúng chỗ cũ, đừng để con số bịa nằm lại trên màn hình.
      if (r.loi || typeof r.dem !== 'number') { datSo(truoc.so); datDaBam(truoc.daBam); return; }
      datSo(r.dem);
      datDaBam(!!r.daBam);
    });
  };

  return (
    <button type="button" onClick={bam} disabled={dangGui} aria-pressed={daBam}
      className={gop('inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors',
        daBam ? 'text-nhan' : 'text-mo hover:text-chu')}>
      <ThumbsUp size={13} aria-hidden fill={daBam ? 'currentColor' : 'none'} />
      {nhan}
    </button>
  );
}
