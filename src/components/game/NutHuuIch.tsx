'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { bamHuuIch } from '@/app/(cua-hang)/game/[duongDan]/viec';
import { bamHuuIchTraLoi } from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';
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
  return (
    <Nut dem={dem} banDauBam={banDauBam} bamDuoc={bamDuoc}
      goi={() => bamHuuIch(danhGiaId)} />
  );
}

/**
 * Nút "Hữu ích" dưới mỗi BÀI TRONG DIỄN ĐÀN.
 *
 * Dùng chung đúng cái ruột với nút của đánh giá, chỉ khác chỗ gọi: cách cư xử
 * lúc bấm — đổi số ngay rồi mới gửi, hỏng thì trả về chỗ cũ — là thứ đã cân
 * nhắc một lần, viết lại lần hai là mở đường cho hai bản trôi khỏi nhau.
 */
export function NutHuuIchTraLoi({ traLoiId, dem, banDauBam, bamDuoc }: {
  traLoiId: string;
  dem: number;
  banDauBam: boolean;
  bamDuoc: boolean;
}) {
  return (
    <Nut dem={dem} banDauBam={banDauBam} bamDuoc={bamDuoc}
      goi={() => bamHuuIchTraLoi(traLoiId)} />
  );
}

function Nut({ dem, banDauBam, bamDuoc, goi }: {
  dem: number;
  banDauBam: boolean;
  bamDuoc: boolean;
  goi: () => Promise<{ loi?: string; dem?: number; daBam?: boolean }>;
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
      const r = await goi();
      // Hỏng thì trả về đúng chỗ cũ, đừng để con số bịa nằm lại trên màn hình.
      if (r.loi || typeof r.dem !== 'number') { datSo(truoc.so); datDaBam(truoc.daBam); return; }
      datSo(r.dem);
      datDaBam(!!r.daBam);
    });
  };

  return (
    /* `data-viec` để bài kiểm gọi đúng nút này: chữ "Hữu ích" còn nằm ở chip
       sắp xếp "Hữu ích nhất" trong tấm đọc hết, nên bắt theo chữ là bắt nhầm —
       đã nhầm thật một lần. */
    <button type="button" onClick={bam} disabled={dangGui} aria-pressed={daBam} data-viec="huu-ich"
      className={gop('inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors',
        daBam ? 'text-nhan' : 'text-mo hover:text-chu')}>
      <ThumbsUp size={13} aria-hidden fill={daBam ? 'currentColor' : 'none'} />
      {nhan}
    </button>
  );
}
