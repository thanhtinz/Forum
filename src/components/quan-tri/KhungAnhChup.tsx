'use client';

import { useActionState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { doiChoAnhChup, themAnhChup, xoaAnhChup, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';
import { ONapAnh } from '@/components/quan-tri/ONapAnh';
import { ANH_TRONG_KET_QUA, TOI_DA_ANH_CHUP } from '@/lib/luat-anh-const';

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

  const day = anh.length >= TOI_DA_ANH_CHUP;

  return (
    <div className="space-y-4">
      {/*
        NÓI RÕ BA TẤM ĐẦU LÀ BA TẤM ĐẶC BIỆT.

        Luật của App Store: kết quả tìm chỉ bày được ba tấm. Người bày hàng
        không biết điều ấy thì họ xếp ảnh theo trình tự màn chơi, và ba tấm ra
        mặt hoá ra là ba màn đầu nhạt nhất. Đây là chỗ duy nhất nói được câu ấy
        đúng lúc — lúc tay họ đang cầm mấy cái nút đổi chỗ.
      */}
      <p className="phu">
        {anh.length}/{TOI_DA_ANH_CHUP} ảnh · {ANH_TRONG_KET_QUA} tấm đầu là {ANH_TRONG_KET_QUA} tấm
        hiện ở kết quả tìm, nên xếp tấm mạnh nhất lên trước.
      </p>
      {anh.length > 0 ? (
        <ul className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
          {anh.map((a, i) => (
            <li key={a.id} className="ke-goi w-36 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.duongDan} alt={a.chuThich ?? ''} loading="lazy"
                className="h-48 w-36 rounded-the border border-vien bg-nen2 object-cover" />
              <p className="phu mt-1 truncate">
                {i < ANH_TRONG_KET_QUA && (
                  <span className="mr-1 rounded-full bg-nhan/12 px-1.5 py-0.5 text-[10px] font-bold text-nhan">
                    ra mặt
                  </span>
                )}
                {a.chuThich ?? `Ảnh ${i + 1}`}
              </p>
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

      {day ? (
        <p className="the p-4 text-[13px] text-mo">
          Đã đủ {TOI_DA_ANH_CHUP} ảnh — trần của một trang game. Muốn thay tấm
          khác thì gỡ bớt một tấm ở trên.
        </p>
      ) : (
      <form action={gui} className="the space-y-3 p-4">
        <p className="text-[14px] font-bold">Thêm ảnh chụp</p>
        <input type="hidden" name="gameId" value={gameId} />

        {/*
          `key` đổi theo SỐ ẢNH ĐANG CÓ, và đó là chủ ý: thêm xong một ảnh thì
          danh sách dài thêm một, `key` đổi, ô chọn ảnh dựng lại từ đầu và sạch
          trơn. Không có nó thì ảnh vừa thêm vẫn nằm trong ô, và người dùng bấm
          "Thêm ảnh" lần nữa là thêm đúng tấm ấy hai lần.
        */}
        <ONapAnh key={anh.length} ten="duongDanAnh" nhan="Ảnh chụp màn hình"
          banDau="" cho="anh-chup"
          goYy="Ảnh gốc của máy là đẹp nhất — đừng phóng to trước khi tải lên." />

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
      )}
    </div>
  );
}
