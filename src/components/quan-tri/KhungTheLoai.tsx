'use client';

import { useActionState, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from 'lucide-react';
import { doiChoTheLoai, luuTheLoai, xoaTheLoai, type KetQua } from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';

export interface TheLoaiQuanTri {
  id: string;
  ten: string;
  duongDan: string;
  soGame: number;
}

/**
 * Quản lý thể loại: thêm, đổi tên, đổi chỗ, xoá.
 *
 * Sửa NGAY TẠI CHỖ thay vì mở một trang riêng cho mỗi thể loại: cả bảng chỉ có
 * hai cột chữ, mà đi một vòng sang trang khác rồi quay về thì đắt hơn nhiều
 * lần so với thứ thật sự thay đổi.
 */
export function KhungTheLoai({ theLoai }: { theLoai: TheLoaiQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(luuTheLoai, {});
  const [dangSua, datDangSua] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ul className="the divide-y divide-vien">
        {theLoai.map((t, i) => (
          <li key={t.id} className="px-4 py-2.5">
            {dangSua === t.id ? (
              <OSua t={t} xong={() => datDangSua(null)} />
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{t.ten}</span>
                  <span className="phu block truncate">/{t.duongDan} · {t.soGame} game</span>
                </span>

                <NutViec lam={() => doiChoTheLoai(t.id, true)} nho={`Đưa ${t.ten} lên trên`}
                  nhan={<ArrowUp size={15} />} className={i === 0 ? 'invisible' : undefined} />
                <NutViec lam={() => doiChoTheLoai(t.id, false)} nho={`Đưa ${t.ten} xuống dưới`}
                  nhan={<ArrowDown size={15} />}
                  className={i === theLoai.length - 1 ? 'invisible' : undefined} />

                <button type="button" onClick={() => datDangSua(t.id)}
                  aria-label={`Sửa ${t.ten}`}
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-mo transition-colors hover:bg-nen3 hover:text-chu">
                  <Pencil size={15} />
                </button>

                {/*
                  Nút xoá chỉ hiện khi thể loại KHÔNG còn game nào.
                  Máy chủ vẫn chặn lấy lần nữa — đây chỉ là đỡ cho người dùng
                  khỏi bấm vào một thứ chắc chắn sẽ báo lỗi.
                */}
                {t.soGame === 0 && (
                  <NutViec lam={() => xoaTheLoai(t.id)} kieu="nguyHiem"
                    nho={`Xoá thể loại ${t.ten}`} nhan={<Trash2 size={15} />}
                    xacNhan={`Xoá thể loại “${t.ten}”?`} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <form action={gui} className="the flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[180px] flex-1">
          <span className="phu mb-1 block">Tên thể loại mới</span>
          <input name="ten" required placeholder="Bắn súng" className="o-nhap" />
        </label>
        <label className="min-w-[180px] flex-1">
          <span className="phu mb-1 block">Đường dẫn (bỏ trống thì tự suy ra)</span>
          <input name="duongDan" placeholder="ban-sung" className="o-nhap" />
        </label>
        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang thêm…' : 'Thêm thể loại'}
        </button>
        {ketQua.loi && (
          <p role="alert" className="basis-full rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}
      </form>
    </div>
  );
}

/** Ô sửa tên tại chỗ. Biểu mẫu riêng để trạng thái lỗi không lẫn với ô thêm mới. */
function OSua({ t, xong }: { t: TheLoaiQuanTri; xong: () => void }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(
    async (truoc, form) => {
      const kq = await luuTheLoai(truoc, form);
      if (!kq.loi) xong();
      return kq;
    },
    {},
  );

  return (
    <form action={gui} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={t.id} />
      <input name="ten" defaultValue={t.ten} required aria-label="Tên thể loại"
        className="o-nhap min-w-[140px] flex-1" />
      <input name="duongDan" defaultValue={t.duongDan} aria-label="Đường dẫn"
        className="o-nhap min-w-[140px] flex-1" />
      <button type="submit" disabled={dangChay} aria-label="Lưu"
        className="shrink-0 rounded-full px-2.5 py-1.5 text-nhan transition-colors hover:bg-nhan/10">
        <Check size={16} />
      </button>
      <button type="button" onClick={xong} aria-label="Thôi"
        className="shrink-0 rounded-full px-2.5 py-1.5 text-mo transition-colors hover:bg-nen3">
        <X size={16} />
      </button>
      {ketQua.loi && (
        <p role="alert" className="basis-full text-[12px] font-medium text-xau">{ketQua.loi}</p>
      )}
    </form>
  );
}
