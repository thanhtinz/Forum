'use client';

import { useActionState, useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { themBanTai, xoaBanTai, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';
import { HE_MAY, MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { gonDungLuong } from '@/lib/tien-ich';

export interface BanQuanTri {
  id: string;
  heMay: string;
  soHieu: string;
  moiNhat: boolean;
  duongDanCuaHang: string | null;
  tep: { id: string; loai: string; duongDan: string; dungLuong: number | null }[];
}

/**
 * Quản lý bản tải của một game.
 *
 * Thêm bản và gắn tệp gộp làm MỘT biểu mẫu: một bản tải không có tệp thì không
 * ai tải được gì, nên tách ra hai bước chỉ tạo cơ hội để quên mất bước hai.
 * Riêng iOS được phép không có tệp — xem chú thích ở `he-may.ts`.
 */
export function KhungBanTai({ gameId, ban }: { gameId: string; ban: BanQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(themBanTai, {});
  const [dangXoa, batDauXoa] = useTransition();

  /*
   * Loại tệp bày ra THEO HỆ ĐANG CHỌN.
   *
   * Gộp cả tám loại vào một danh sách thì gắn nhầm tệp JAR cho bản Windows là
   * chuyện sớm muộn, mà lỗi ấy chỉ lộ ra lúc có người tải về và không mở được.
   * Lọc ngay ở đây thì chọn sai là chuyện không xảy ra được.
   */
  const [heMay, datHeMay] = useState<MaHeMay>('JAVA');
  const loaiHopLe = MO_TA_HE[heMay].loaiTep;

  return (
    <div className="space-y-4">
      {ban.length > 0 && (
        <ul className="the divide-y divide-vien">
          {ban.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">
                  {MO_TA_HE[b.heMay as keyof typeof MO_TA_HE]?.ten ?? b.heMay} · {b.soHieu}
                  {b.moiNhat && <span className="ml-2 text-[11px] font-bold text-nhan">mới nhất</span>}
                </p>
                <p className="phu mt-0.5 truncate">
                  {b.tep.length > 0
                    ? b.tep.map((t) => `${t.loai}${t.dungLuong ? ` (${gonDungLuong(t.dungLuong)})` : ''}`).join(', ')
                    : b.duongDanCuaHang
                      ? 'Dẫn sang cửa hàng ngoài'
                      : 'Chưa gắn tệp'}
                </p>
              </div>
              <button type="button" disabled={dangXoa}
                onClick={() => batDauXoa(async () => { await xoaBanTai(b.id); })}
                aria-label={`Xoá bản ${b.soHieu}`}
                className="grid size-9 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-xau/10 hover:text-xau">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={gui} className="the space-y-3 p-4">
        <p className="text-[14px] font-bold">Thêm bản tải</p>
        <input type="hidden" name="gameId" value={gameId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="phu mb-1 block">Hệ máy</span>
            <select name="heMay" className="o-nhap" value={heMay}
              onChange={(e) => datHeMay(e.target.value as MaHeMay)}>
              {HE_MAY.map((h) => <option key={h} value={h}>{MO_TA_HE[h].ten}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="phu mb-1 block">Số hiệu</span>
            <input name="soHieu" required placeholder="1.0" className="o-nhap" />
          </label>
          <label className="block">
            <span className="phu mb-1 block">Loại tệp</span>
            <select name="loaiTep" className="o-nhap" key={heMay} defaultValue={loaiHopLe[0]}>
              {loaiHopLe.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="phu mb-1 block">Địa chỉ tệp</span>
            <input name="duongDanTep" placeholder={`/tep-mau/vi-du.${loaiHopLe[0].toLowerCase()}`}
              className="o-nhap" />
          </label>
        </div>

        <label className="block">
          <span className="phu mb-1 block">Đường dẫn cửa hàng chính chủ (không bắt buộc)</span>
          <input name="duongDanCuaHang" placeholder="https://apps.apple.com/… hoặc play.google.com/…"
            className="o-nhap" />
          <span className="phu mt-1 block">
            Hiện thành một nút phụ đứng sau nút tải, cho ai muốn lấy bản chính chủ.
          </span>
        </label>

        <label className="block">
          <span className="phu mb-1 block">Có gì mới ở bản này</span>
          <textarea name="doiMoi" rows={2} className="o-nhap" />
        </label>

        {ketQua.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}

        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Thêm bản tải'}
        </button>
      </form>
    </div>
  );
}
