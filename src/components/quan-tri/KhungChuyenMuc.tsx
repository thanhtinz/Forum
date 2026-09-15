'use client';

import { useActionState, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from 'lucide-react';
import {
  doiChoChuyenMuc, luuChuyenMuc, xoaChuyenMuc, type KetQua,
} from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';
import { ONapAnh } from './ONapAnh';
import { ONhapGiu } from '@/components/ONhapGiu';
import { MO_TA_TOI_DA, TEN_TOI_DA } from '@/lib/chuyen-muc-const';

export interface MucQuanTri {
  id: string;
  ten: string;
  duongDan: string;
  moTa: string;
  anh: string;
  soChuDe: number;
}

/**
 * Quản lý chuyên mục diễn đàn: thêm, sửa, đổi chỗ, xoá.
 *
 * Cùng lối với bảng thể loại — sửa NGAY TẠI CHỖ, không mở trang riêng cho mỗi
 * mục. Khác một chỗ: mỗi mục có thêm BIỂU TƯỢNG, nên hàng phải bày được tấm
 * ảnh ấy. Bày ảnh ngay trong hàng chứ không giấu sau nút sửa, vì thứ hay sai
 * nhất ở một bảng biểu tượng là hai mục lỡ dùng chung một hình.
 */
export function KhungChuyenMuc({ muc }: { muc: MucQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(luuChuyenMuc, {});
  const [dangSua, datDangSua] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {muc.length > 0 && (
        <ul className="the divide-y divide-vien">
          {muc.map((m, i) => (
            <li key={m.id} className="px-4 py-3">
              {dangSua === m.id ? (
                <OSua m={m} xong={() => datDangSua(null)} />
              ) : (
                <div className="flex items-center gap-3">
                  <Hinh ten={m.ten} anh={m.anh} />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{m.ten}</span>
                    {m.moTa && <span className="phu block truncate">{m.moTa}</span>}
                    <span className="phu block truncate text-[12px]">
                      ?muc={m.duongDan} · {m.soChuDe} chủ đề
                    </span>
                  </span>

                  <NutViec lam={() => doiChoChuyenMuc(m.id, true)} nho={`Đưa ${m.ten} lên trên`}
                    nhan={<ArrowUp size={15} />} className={i === 0 ? 'invisible' : undefined} />
                  <NutViec lam={() => doiChoChuyenMuc(m.id, false)} nho={`Đưa ${m.ten} xuống dưới`}
                    nhan={<ArrowDown size={15} />}
                    className={i === muc.length - 1 ? 'invisible' : undefined} />

                  <button type="button" onClick={() => datDangSua(m.id)}
                    aria-label={`Sửa ${m.ten}`}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-mo transition-colors hover:bg-nen3 hover:text-chu">
                    <Pencil size={15} />
                  </button>

                  {/*
                    Câu xác nhận NÓI RA số chủ đề sẽ rơi về mục Chung.
                    Chuyên mục dùng chung cả cửa hàng, nên con số ấy có thể lớn
                    hơn nhiều so với thứ người bấm đang hình dung.
                  */}
                  <NutViec lam={() => xoaChuyenMuc(m.id)} kieu="nguyHiem"
                    nho={`Xoá chuyên mục ${m.ten}`} nhan={<Trash2 size={15} />}
                    xacNhan={m.soChuDe > 0
                      ? `Xoá chuyên mục “${m.ten}”? ${m.soChuDe} chủ đề bên trong sẽ về mục Chung, không bài nào mất.`
                      : `Xoá chuyên mục “${m.ten}”?`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={gui} className="the space-y-3 p-4">
        <p className="text-[14px] font-bold">Thêm chuyên mục</p>

        <div className="flex flex-wrap gap-3">
          <label className="min-w-[180px] flex-1">
            <span className="phu mb-1 block">Tên</span>
            <input name="ten" required maxLength={TEN_TOI_DA} placeholder="Hỏi đáp qua màn"
              className="o-nhap" />
          </label>
          <label className="min-w-[180px] flex-1">
            <span className="phu mb-1 block">Đường dẫn (bỏ trống thì tự suy ra)</span>
            <input name="duongDan" placeholder="hoi-dap-qua-man" className="o-nhap" />
          </label>
        </div>

        <label className="block">
          <span className="phu mb-1 block">Một dòng nói mục này để bàn chuyện gì</span>
          <input name="moTa" maxLength={MO_TA_TOI_DA}
            placeholder="Kẹt màn nào thì hỏi ở đây" className="o-nhap" />
        </label>

        <ONapAnh ten="anh" nhan="Biểu tượng (không bắt buộc)" banDau="" cho="chuyen-muc"
          goYy="Hình vuông thì đẹp nhất — bảng cắt vuông lúc bày." />

        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Thêm chuyên mục'}
        </button>

        {ketQua.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}
      </form>
    </div>
  );
}

/** Biểu tượng của một mục; chưa có ảnh thì lấy chữ cái đầu. */
function Hinh({ ten, anh }: { ten: string; anh: string }) {
  if (anh) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={anh} alt="" className="bieu-tuong size-11 shrink-0 object-cover" />;
  }
  return (
    <span aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-nut bg-nen3 text-[15px] font-bold text-mo">
      {ten.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Ô sửa tại chỗ. Biểu mẫu riêng để lỗi không lẫn với ô thêm mới. */
function OSua({ m, xong }: { m: MucQuanTri; xong: () => void }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(
    async (truoc, form) => {
      const kq = await luuChuyenMuc(truoc, form);
      if (!kq.loi) xong();
      return kq;
    },
    {},
  );

  return (
    <form action={gui} className="space-y-3">
      <input type="hidden" name="id" value={m.id} />

      <div className="flex flex-wrap items-center gap-2">
        <ONhapGiu name="ten" banDau={m.ten} required maxLength={TEN_TOI_DA}
          aria-label="Tên chuyên mục" className="o-nhap min-w-[140px] flex-1" />
        <ONhapGiu name="duongDan" banDau={m.duongDan} aria-label="Đường dẫn"
          className="o-nhap min-w-[140px] flex-1" />
        <button type="submit" disabled={dangChay} aria-label="Lưu"
          className="shrink-0 rounded-full px-2.5 py-1.5 text-nhan transition-colors hover:bg-nhan/10">
          <Check size={16} />
        </button>
        <button type="button" onClick={xong} aria-label="Thôi"
          className="shrink-0 rounded-full px-2.5 py-1.5 text-mo transition-colors hover:bg-nen3">
          <X size={16} />
        </button>
      </div>

      <ONhapGiu name="moTa" banDau={m.moTa} maxLength={MO_TA_TOI_DA}
        aria-label="Mô tả chuyên mục" placeholder="Một dòng nói mục này bàn chuyện gì"
        className="o-nhap" />

      <ONapAnh ten="anh" nhan="Biểu tượng" banDau={m.anh} cho="chuyen-muc" />

      {ketQua.loi && (
        <p role="alert" className="text-[12px] font-medium text-xau">{ketQua.loi}</p>
      )}
    </form>
  );
}
