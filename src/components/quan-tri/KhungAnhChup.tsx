'use client';

import { useActionState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { doiChoAnhChup, themAnhChup, xoaAnhChup, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';

export interface AnhQuanTri {
  id: string;
  duongDan: string;
  chuThich: string | null;
}

/**
 * Quản lý ảnh chụp của một game.
 *
 * Ảnh bày ra dạng hàng ngang cuộn được, giống đúng chỗ nó sẽ nằm ở trang công
 * khai — xếp thứ tự mà không thấy kết quả giống trang thật thì xếp bằng cảm giác.
 */
export function KhungAnhChup({ gameId, anh }: { gameId: string; anh: AnhQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(themAnhChup, {});
  const [dangSua, batDauSua] = useTransition();

  return (
    <div className="space-y-4">
      {anh.length > 0 ? (
        <ul className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
          {anh.map((a, i) => (
            <li key={a.id} className="ke-goi w-36 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.duongDan} alt={a.chuThich ?? ''} loading="lazy"
                className="h-48 w-36 rounded-the border border-vien bg-nen2 object-cover" />
              <p className="phu mt-1 truncate">{a.chuThich ?? `Ảnh ${i + 1}`}</p>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" disabled={dangSua || i === 0}
                  onClick={() => batDauSua(async () => { await doiChoAnhChup(a.id, true); })}
                  aria-label={`Đưa ảnh ${i + 1} lên trước`}
                  className="grid size-8 place-items-center rounded-full text-mo transition-colors hover:bg-nen3 disabled:opacity-40">
                  <ArrowUp size={15} />
                </button>
                <button type="button" disabled={dangSua || i === anh.length - 1}
                  onClick={() => batDauSua(async () => { await doiChoAnhChup(a.id, false); })}
                  aria-label={`Đưa ảnh ${i + 1} xuống sau`}
                  className="grid size-8 place-items-center rounded-full text-mo transition-colors hover:bg-nen3 disabled:opacity-40">
                  <ArrowDown size={15} />
                </button>
                <button type="button" disabled={dangSua}
                  onClick={() => batDauSua(async () => { await xoaAnhChup(a.id); })}
                  aria-label={`Xoá ảnh ${i + 1}`}
                  className="ml-auto grid size-8 place-items-center rounded-full text-mo transition-colors hover:bg-xau/10 hover:text-xau">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="phu">Chưa có ảnh nào, nên trang game đang trống phần đầu.</p>
      )}

      <form action={gui} className="the space-y-3 p-4">
        <p className="text-[14px] font-bold">Thêm ảnh chụp</p>
        <input type="hidden" name="gameId" value={gameId} />

        <label className="block">
          <span className="phu mb-1 block">Địa chỉ ảnh</span>
          <input name="duongDanAnh" required placeholder="/anh/game/vi-du-1.jpg" className="o-nhap" />
        </label>

        <label className="block">
          <span className="phu mb-1 block">Chú thích (không bắt buộc)</span>
          <input name="chuThich" placeholder="Màn chơi đầu tiên" className="o-nhap" />
        </label>

        {ketQua.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}

        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Thêm ảnh'}
        </button>
      </form>
    </div>
  );
}
