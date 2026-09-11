'use client';

import { useState, useTransition } from 'react';
import { Check, Flag } from 'lucide-react';
import { baoXau } from '@/app/(cua-hang)/bao-xau';
import { GHI_CHU_TOI_DA, LY_DO } from '@/lib/bao-xau-const';

/**
 * Nút báo xấu — một dòng chữ nhỏ, mở ra thành ô chọn lý do.
 *
 * Cố ý KHÔNG nổi bật. Đây là việc hiếm khi phải làm, mà một nút đỏ to cạnh mỗi
 * bài viết thì biến cả diễn đàn thành chỗ trông như đầy vi phạm. Nhưng cũng
 * không giấu sau menu: lúc cần thì phải thấy ngay, không thì người ta bỏ qua
 * và bài rác ở lại.
 *
 * Bấm xong đổi hẳn thành "Đã báo" và không cho bấm lại: bấm lần hai chẳng thêm
 * được gì (CSDL chặn hàng trùng), mà nút vẫn sáng thì người ta sẽ bấm nữa vì
 * tưởng lần đầu trượt.
 */
export function NutBaoXau({ loai, mucId, nhan = 'Báo xấu' }: {
  loai: 'danhGia' | 'chuDe' | 'traLoi';
  mucId: string;
  nhan?: string;
}) {
  const [mo, datMo] = useState(false);
  const [xong, datXong] = useState(false);
  const [lyDo, datLyDo] = useState<string>(LY_DO[0].ma);
  const [ghiChu, datGhiChu] = useState('');
  const [loi, datLoi] = useState<string | null>(null);
  const [dangGui, batDau] = useTransition();

  if (xong) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-mo">
        <Check size={13} aria-hidden /> Đã báo, cảm ơn bạn
      </span>
    );
  }

  if (!mo) {
    return (
      <button type="button" onClick={() => datMo(true)}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-mo hover:text-xau hover:underline">
        <Flag size={12} aria-hidden /> {nhan}
      </button>
    );
  }

  const gui = () => {
    datLoi(null);
    batDau(async () => {
      const kq = await baoXau(loai, mucId, lyDo, ghiChu);
      if (kq.loi) datLoi(kq.loi);
      else { datXong(true); datMo(false); }
    });
  };

  return (
    <div className="mt-2 w-full rounded-the border border-vien bg-nen3/50 p-3">
      <p className="text-[13px] font-bold">Báo nội dung này</p>

      <fieldset className="mt-2">
        <legend className="sr-only">Lý do báo</legend>
        <div className="flex flex-wrap gap-1.5">
          {LY_DO.map((l) => (
            <label key={l.ma}
              className={`chip cursor-pointer ${lyDo === l.ma ? 'chip-chon' : ''}`}>
              {/* Ô chọn thật, giấu đi: bàn phím vẫn Tab và mũi tên chọn được,
                  còn mắt thì thấy một dãy chip như mọi chỗ khác trên trang. */}
              <input type="radio" name="lyDo" value={l.ma} checked={lyDo === l.ma}
                onChange={() => datLyDo(l.ma)} className="sr-only" />
              {l.ten}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-2 block">
        <span className="sr-only">Ghi chú thêm</span>
        <input value={ghiChu} onChange={(e) => datGhiChu(e.target.value)}
          maxLength={GHI_CHU_TOI_DA} placeholder="Nói thêm một câu (không bắt buộc)"
          className="o-nhap" />
      </label>

      {loi && <p role="alert" className="mt-2 text-[12px] font-medium text-xau">{loi}</p>}

      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={gui} disabled={dangGui} className="nut-xam">
          {dangGui ? 'Đang gửi…' : 'Gửi báo cáo'}
        </button>
        <button type="button" onClick={() => datMo(false)}
          className="text-[12px] font-semibold text-mo hover:underline">Thôi</button>
      </div>
    </div>
  );
}
