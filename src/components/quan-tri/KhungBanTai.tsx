'use client';

import { useActionState, useState, useTransition } from 'react';
import { Check, ChevronDown, Paperclip, Pencil, Trash2, X } from 'lucide-react';
import {
  datBanMoiNhat, suaBanTai, themBanTai, themTep, xoaBanTai, xoaTep, type KetQua,
} from '@/app/(quan-tri)/quan-tri/viec';
import { HE_MAY, LOAI_TEP, MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { gonDungLuong, gop } from '@/lib/tien-ich';
import { NutViec } from './NutViec';

export interface BanQuanTri {
  id: string;
  heMay: string;
  soHieu: string;
  moiNhat: boolean;
  ghiChu: string | null;
  doiMoi: string | null;
  ngayRa: string | null;
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
          {ban.map((b) => <MotBan key={b.id} b={b} dangXoa={dangXoa} batDauXoa={batDauXoa} />)}
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

/**
 * Một bản tải trong danh sách: gấp lại thành một dòng, mở ra thì sửa được.
 *
 * Một game có thể có hai chục bản. Bày hết biểu mẫu của cả hai chục bản ra
 * cùng lúc thì trang dài mấy màn hình mà chín mươi phần trăm là ô chữ không ai
 * đụng tới. Gấp lại thì danh sách vẫn liếc một cái là nắm hết, còn muốn sửa
 * bản nào thì mở đúng bản ấy.
 */
function MotBan({ b, dangXoa, batDauXoa }: {
  b: BanQuanTri;
  dangXoa: boolean;
  batDauXoa: (f: () => void) => void;
}) {
  const [mo, datMo] = useState(false);
  const ten = MO_TA_HE[b.heMay as keyof typeof MO_TA_HE]?.ten ?? b.heMay;

  return (
    <li>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => datMo(!mo)}
          aria-expanded={mo} aria-label={`${mo ? 'Thu' : 'Mở'} bản ${ten} ${b.soHieu}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown size={15} aria-hidden
            className={gop('shrink-0 text-mo transition-transform', mo && 'rotate-180')} />
          <span className="min-w-0">
            <span className="block text-[14px] font-medium">
              {ten} · {b.soHieu}
              {b.moiNhat && <span className="ml-2 text-[11px] font-bold text-nhan">mới nhất</span>}
            </span>
            <span className="phu block truncate">
              {b.tep.length > 0
                ? b.tep.map((t) => `${t.loai}${t.dungLuong ? ` (${gonDungLuong(t.dungLuong)})` : ''}`).join(', ')
                : b.duongDanCuaHang
                  ? 'Dẫn sang cửa hàng ngoài'
                  : 'Chưa gắn tệp'}
            </span>
          </span>
        </button>

        {/* Chỉ mời đặt cờ khi bản này CHƯA mang cờ: bấm "đặt mới nhất" lên
            đúng bản đang là mới nhất thì chẳng có gì xảy ra, mà người bấm lại
            tưởng mình vừa làm hỏng cái gì. */}
        {!b.moiNhat && (
          <NutViec lam={() => datBanMoiNhat(b.id)} nhan="Đặt mới nhất"
            xacNhan={`Đặt ${ten} ${b.soHieu} làm bản mới nhất của hệ ${ten}?`} />
        )}

        <button type="button" disabled={dangXoa}
          onClick={() => {
            if (!window.confirm(`Xoá bản ${ten} ${b.soHieu} cùng ${b.tep.length} tệp của nó?`)) return;
            batDauXoa(async () => { await xoaBanTai(b.id); });
          }}
          aria-label={`Xoá bản ${b.soHieu}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-mo transition-colors hover:bg-xau/10 hover:text-xau">
          <Trash2 size={16} />
        </button>
      </div>

      {mo && (
        <div className="space-y-4 border-t border-vien bg-nen3/40 px-4 py-4">
          <OSuaBan b={b} />
          <KhoiTep b={b} />
        </div>
      )}
    </li>
  );
}

/** Biểu mẫu sửa một bản. Hệ máy KHÔNG sửa được — xem chú thích bên trong. */
function OSuaBan({ b }: { b: BanQuanTri }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(suaBanTai, {});
  const [xong, datXong] = useState(false);

  return (
    <form action={async (f) => { datXong(false); await gui(f); datXong(true); }} className="space-y-3">
      <input type="hidden" name="banId" value={b.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="phu mb-1 block">Số hiệu</span>
          <input name="soHieu" defaultValue={b.soHieu} required className="o-nhap" />
        </label>
        <label className="block">
          <span className="phu mb-1 block">Ngày ra</span>
          <input name="ngayRa" type="date" defaultValue={b.ngayRa ?? ''} className="o-nhap" />
        </label>
      </div>

      {/*
        Hệ máy cố ý KHÔNG sửa được ở đây.

        Đổi hệ của một bản đã có là kéo theo cả dây: cờ "mới nhất" của hai hệ
        cùng sai một lúc, mấy tệp đang gắn thành sai loại (JAR nằm dưới nhãn
        Windows), và `@@unique([gameId, heMay, soHieu])` có thể đụng nhau. Gắn
        nhầm hệ thì xoá bản đi rồi thêm lại — mất vài giây, mà đúng chắc chắn.
      */}
      <p className="phu">Hệ máy: {MO_TA_HE[b.heMay as keyof typeof MO_TA_HE]?.ten ?? b.heMay} · gắn nhầm thì xoá bản rồi thêm lại</p>

      <label className="block">
        <span className="phu mb-1 block">Đường dẫn cửa hàng chính chủ</span>
        <input name="duongDanCuaHang" defaultValue={b.duongDanCuaHang ?? ''}
          placeholder="https://apps.apple.com/…" className="o-nhap" />
      </label>

      <label className="block">
        <span className="phu mb-1 block">Có gì mới ở bản này</span>
        <textarea name="doiMoi" rows={2} defaultValue={b.doiMoi ?? ''} className="o-nhap" />
      </label>

      <label className="block">
        <span className="phu mb-1 block">Ghi chú tương thích</span>
        <input name="ghiChu" defaultValue={b.ghiChu ?? ''}
          placeholder="Cần máy hỗ trợ MIDP 2.0" className="o-nhap" />
      </label>

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang lưu…' : 'Lưu bản này'}
        </button>
        {xong && !ketQua.loi && !dangChay && (
          <span className="flex items-center gap-1 text-[13px] font-semibold text-nhan">
            <Check size={14} aria-hidden /> Đã lưu
          </span>
        )}
      </div>
    </form>
  );
}

/** Danh sách tệp của một bản, thêm và gỡ được từng cái. */
function KhoiTep({ b }: { b: BanQuanTri }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(themTep, {});
  const loaiHopLe = MO_TA_HE[b.heMay as keyof typeof MO_TA_HE]?.loaiTep ?? LOAI_TEP;

  return (
    <div className="space-y-2 border-t border-vien pt-4">
      <p className="text-[13px] font-bold">Tệp của bản này</p>

      {b.tep.length === 0 ? (
        <p className="phu">
          Chưa có tệp nào{b.duongDanCuaHang ? ' — bản này chỉ dẫn sang cửa hàng ngoài.' : '. Không ai tải được gì.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {b.tep.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-nut bg-nen2 px-3 py-2">
              <Paperclip size={13} className="shrink-0 text-mo" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">
                  {t.loai}
                  {/* Dung lượng đo từ tệp thật. Trống nghĩa là không tìm thấy
                      tệp ở đường dẫn ấy, hoặc nó nằm ở máy chủ khác. */}
                  <span className="phu ml-2 font-normal">
                    {t.dungLuong ? gonDungLuong(t.dungLuong) : 'chưa đo được dung lượng'}
                  </span>
                </span>
                <span className="phu block truncate">{t.duongDan}</span>
              </span>
              <NutViec lam={() => xoaTep(t.id)} kieu="nguyHiem"
                nho={`Gỡ tệp ${t.loai}`} nhan={<X size={15} />}
                xacNhan={`Gỡ tệp ${t.loai} khỏi bản ${b.soHieu}?`} />
            </li>
          ))}
        </ul>
      )}

      <form action={gui} className="flex flex-wrap items-end gap-2 pt-1">
        <input type="hidden" name="banId" value={b.id} />
        <label className="w-[110px]">
          <span className="phu mb-1 block">Loại</span>
          <select name="loaiTep" defaultValue={loaiHopLe[0]} className="o-nhap">
            {loaiHopLe.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="phu mb-1 block">Địa chỉ tệp</span>
          <input name="duongDanTep" placeholder={`/tep-mau/vi-du.${loaiHopLe[0].toLowerCase()}`}
            className="o-nhap" />
        </label>
        {/* Nhãn đọc được kèm số hiệu bản: trang này có thể mở nhiều bản cùng
            lúc, và "Gắn tệp" trơ trọi thì bộ đọc màn hình đọc ra ba bốn nút
            giống hệt nhau mà không nói được nút nào của bản nào. */}
        <button type="submit" disabled={dangChay} aria-label={`Gắn tệp vào bản ${b.soHieu}`}
          className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Gắn tệp'}
        </button>
        {ketQua.loi && (
          <p role="alert" className="basis-full text-[12px] font-medium text-xau">{ketQua.loi}</p>
        )}
      </form>
    </div>
  );
}
