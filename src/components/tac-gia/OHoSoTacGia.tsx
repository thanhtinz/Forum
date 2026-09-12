'use client';

import { useActionState } from 'react';
import { OSoanThao } from '@/components/quan-tri/OSoanThao';
import { luuHoSoTacGia, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';

export function OHoSoTacGia({ tenTacGia, gioiThieu, tenDuPhong }: {
  tenTacGia: string;
  gioiThieu: string;
  tenDuPhong: string;
}) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(luuHoSoTacGia, {});

  return (
    <form action={gui} className="the space-y-4 p-4">
      <label className="block">
        <span className="phu mb-1 block">Tên hiện ở trang tác giả</span>
        <input name="tenTacGia" defaultValue={tenTacGia} maxLength={60} className="o-nhap"
          placeholder={tenDuPhong} />
        {/* Bỏ trống là chuyện thường, không phải thiếu sót: người làm game một
            mình chẳng cần nghĩ ra tên hãng. */}
        <span className="phu mt-1 block">Bỏ trống thì dùng “{tenDuPhong}”.</span>
      </label>

      <OSoanThao ten="gioiThieuTacGia" nhan="Giới thiệu" giaTri={gioiThieu} dong={6} chiDan
        goYy="Vài dòng về bạn và mấy game bạn làm." />

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}
      {ketQua.ok && (
        <p role="status" className="rounded-nut bg-emerald-500/10 px-3 py-2 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
          Đã lưu hồ sơ.
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam !min-h-[40px] !px-6 !text-[14px]">
        {dangChay ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </button>
    </form>
  );
}
