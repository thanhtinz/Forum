'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { nhanTuVi, type TienState } from '@/app/(site)/tu-tien/actions';
import type { NhanVatXem } from '@/lib/tu-tien';
import { BE_QUAN_TRAN_MS } from '@/lib/tu-tien-const';

/**
 * Bế quan — tu luyện ngoại tuyến.
 *
 * GDD mục 27: máy chủ giữ mốc, lúc vào thì tính `min(quãng trôi, trần) × tốc
 * độ`. Trần có mặt để người vào mỗi ngày một lần không bị bỏ lại quá xa, mà
 * cũng không ai bỏ game một tháng rồi quay lại thành cao thủ.
 *
 * Con số ở đây do MÁY CHỦ tính rồi truyền xuống; trang không tự cộng theo
 * đồng hồ trình duyệt — GDD nói thẳng "không tin timestamp từ client".
 */
export function BeQuan({ nv }: { nv: NhanVatXem }) {
  const router = useRouter();
  const [tin, setTin] = useState<TienState>({});
  const [dangLam, batDau] = useTransition();

  const lam = () => batDau(async () => {
    setTin(await nhanTuVi({}, new FormData()));
    router.refresh();
  });

  const gio = Math.round(BE_QUAN_TRAN_MS / 3_600_000);

  return (
    <section className="tien-giay p-5">
      <h2 className="mb-1 text-lg font-black">Bế quan</h2>
      <p className="mb-3 text-sm opacity-75">
        Rời trang vẫn tu. Máy chủ gom tu vi theo thời gian trôi, tối đa {gio} giờ
        một lần — quá {gio} giờ thì phần dôi ra không tính nữa.
      </p>

      <div className="mb-1 flex items-baseline justify-between text-xs opacity-75">
        <span>Bình chứa</span>
        <span>{nv.phanTramBeQuan}% của {gio} giờ</span>
      </div>
      <div className="tien-thanh mb-3">
        <i style={{ width: `${Math.max(2, nv.phanTramBeQuan)}%` }} />
      </div>

      <p className="mb-3 text-sm">
        {nv.kichTran
          ? 'Đã tới trần cảnh giới của giai đoạn này — bế quan thêm cũng không vào đâu.'
          : <>Đang chờ nhận: <b className="tien-son">{nv.choNhan.toLocaleString('vi')}</b> tu vi.</>}
      </p>

      {tin.ke && <p className="tien-ngoc mb-2 text-sm font-semibold">{tin.ke}</p>}
      {tin.error && <p className="tien-son mb-2 text-sm font-semibold">{tin.error}</p>}

      <button type="button" disabled={dangLam || nv.kichTran || nv.choNhan <= 0}
        onClick={lam} className="tien-nut px-4 py-2.5 text-sm">
        Xuất quan nhận tu vi
      </button>
    </section>
  );
}
