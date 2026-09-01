'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { taoNhanVat, type TienState } from '@/app/(site)/tu-tien/actions';
import {
  DAO, LINH_CAN, TEN_TOI_DA, THUOC_TINH, TI_LE_DI_LINH_CAN, TONG_THUOC_TINH,
} from '@/lib/tu-tien-const';
import { cn } from '@/lib/utils';

/**
 * Lập đạo hiệu và chọn đạo.
 *
 * Người chơi chọn ĐẠO, còn tám thuộc tính và linh căn thì máy chủ gieo — nên
 * màn này nói trước cả hai điều ấy: chọn gì là quyền của bạn, gieo gì là số
 * trời. Giấu chuyện gieo đi thì lúc vào game thấy một bộ thuộc tính lạ hoắc,
 * tưởng mình bấm nhầm.
 */
export function TaoNhanVat() {
  const router = useRouter();
  const [ten, setTen] = useState('');
  const [dao, setDao] = useState<string>('');
  const [tin, setTin] = useState<TienState>({});
  const [dangLam, batDau] = useTransition();

  const lam = () => batDau(async () => {
    const fd = new FormData();
    fd.set('ten', ten);
    fd.set('dao', dao);
    const kq = await taoNhanVat({}, fd);
    setTin(kq);
    if (kq.ok) router.refresh();
  });

  return (
    <div className="space-y-4">
      <section className="tien-trieu p-5">
        <h2 className="mb-1 text-lg font-black">Lập đạo hiệu</h2>
        <p className="mb-3 text-sm opacity-75">
          Một tài khoản một nhân vật. Đạo hiệu không đổi được về sau.
        </p>
        <input value={ten} onChange={(e) => setTen(e.target.value)}
          maxLength={TEN_TOI_DA} placeholder="Đạo hiệu…" aria-label="Đạo hiệu"
          className="input w-full" />
      </section>

      <section className="tien-giay p-5">
        <h2 className="mb-1 text-lg font-black">Chọn đạo</h2>
        <p className="mb-3 text-sm opacity-75">
          Năm đạo đi năm đường khác nhau, không phải năm cái tên của cùng một
          lối chơi. Đạo chính quyết định phần lớn bản sắc; đạo phụ mở về sau.
        </p>
        <ul className="space-y-2">
          {DAO.map((d) => (
            <li key={d.ma}>
              <button type="button" onClick={() => setDao(d.ma)}
                aria-pressed={dao === d.ma}
                className={cn('w-full p-3 text-left transition-colors',
                  dao === d.ma ? 'tien-trieu' : 'tien-nut-vien')}>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <b className="text-base">{d.ten}</b>
                  <span className="text-xs opacity-70">{d.taiNguyen}</span>
                </span>
                <span className="mt-1 block text-sm opacity-85">{d.loiChoi}</span>
                <span className="mt-1 block text-xs opacity-70">
                  Mạnh: {d.manh} · Yếu: {d.yeu}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="tien-giay p-5">
        <h2 className="mb-1 text-lg font-black">Số trời</h2>
        <p className="mb-3 text-sm opacity-75">
          Tám thuộc tính và linh căn do máy chủ gieo lúc lập đạo hiệu, tổng
          luôn là {TONG_THUOC_TINH} điểm — chỉ khác nhau ở cách chia, nên không
          ai bước vào cửa với một bộ hơn hẳn người khác.
        </p>
        <ul className="mb-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {THUOC_TINH.map((t) => (
            <li key={t.ma} className="flex justify-between gap-2 border-b pb-1"
              style={{ borderColor: 'var(--tien-vien)' }}>
              <b>{t.ten}</b>
              <span className="text-right text-xs opacity-70">{t.dung}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm opacity-75">
          Linh căn bốc trong {LINH_CAN.filter((x) => !x.di).map((x) => x.ten).join(', ')};
          {' '}có {Math.round(TI_LE_DI_LINH_CAN * 100)}% ra dị linh căn{' '}
          {LINH_CAN.filter((x) => x.di).map((x) => x.ten).join(', ')} — hiếm hơn
          và tu nhanh hơn một chút.
        </p>
      </section>

      {tin.error && <p className="tien-son text-sm font-semibold">{tin.error}</p>}

      <button type="button" disabled={dangLam || ten.trim().length < 2 || !dao}
        onClick={lam} className="tien-nut w-full px-4 py-3 text-base">
        Bái nhập đạo đồ
      </button>
    </div>
  );
}
