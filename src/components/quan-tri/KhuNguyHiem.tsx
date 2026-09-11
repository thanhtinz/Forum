'use client';

import { useState, useTransition } from 'react';
import { TriangleAlert } from 'lucide-react';
import { xoaGame } from '@/app/(quan-tri)/quan-tri/viec';

/**
 * KHU NGUY HIỂM — xoá hẳn một game.
 *
 * Gấp lại mặc định, và nằm CUỐI trang. Nút xoá đặt cạnh nút lưu là công thức
 * chắc chắn có ngày bấm nhầm; đẩy xuống cuối thì phải cuộn qua cả biểu mẫu mới
 * gặp nó, mà cuộn ấy chính là nhịp dừng cần có.
 *
 * Bắt GÕ LẠI đúng tên game. Một hộp "bạn có chắc không?" thì ai cũng bấm Đồng
 * ý theo phản xạ; gõ lại cái tên thì buộc phải đọc xem mình đang đứng ở game
 * nào. Máy chủ kiểm tên lần nữa — chỗ này chỉ là lớp đỡ cho người dùng.
 */
export function KhuNguyHiem({ gameId, ten, soDanhGia, soChuDe }: {
  gameId: string;
  ten: string;
  soDanhGia: number;
  soChuDe: number;
}) {
  const [mo, datMo] = useState(false);
  const [go, datGo] = useState('');
  const [loi, datLoi] = useState<string | null>(null);
  const [dangXoa, batDau] = useTransition();

  if (!mo) {
    return (
      <button type="button" onClick={() => datMo(true)}
        className="text-[13px] font-semibold text-mo hover:text-xau hover:underline">
        Xoá hẳn game này
      </button>
    );
  }

  const xoa = () => {
    datLoi(null);
    batDau(async () => {
      const kq = await xoaGame(gameId, go);
      if (kq?.loi) datLoi(kq.loi);
    });
  };

  return (
    <div className="rounded-the border border-xau/30 bg-xau/5 p-4">
      <p className="flex items-center gap-2 text-[14px] font-bold text-xau">
        <TriangleAlert size={16} aria-hidden /> Xoá hẳn “{ten}”
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-mo">
        Xoá luôn mọi bản tải, ảnh chụp, {soDanhGia} đánh giá và {soChuDe} chủ đề thảo luận
        của game này. Không lùi lại được.
      </p>

      <label className="mt-3 block">
        <span className="phu mb-1 block">Gõ lại đúng tên game để xác nhận</span>
        <input value={go} onChange={(e) => datGo(e.target.value)} placeholder={ten}
          aria-label="Gõ lại tên game" className="o-nhap" />
      </label>

      {loi && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-xau">{loi}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={xoa} disabled={dangXoa || go.trim() !== ten}
          className="nut rounded-full bg-xau px-4 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
          {dangXoa ? 'Đang xoá…' : 'Xoá hẳn'}
        </button>
        <button type="button" onClick={() => { datMo(false); datGo(''); datLoi(null); }}
          className="text-[13px] font-semibold text-mo hover:underline">
          Thôi
        </button>
      </div>
    </div>
  );
}
