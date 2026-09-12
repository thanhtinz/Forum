'use client';

import { useActionState, useState, useTransition } from 'react';
import { useXacNhan } from '@/components/HopXacNhan';
import {
  suaChuDe, suaTraLoi, xoaChuDeCuaToi, xoaTraLoiCuaToi, type KetQua,
} from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';

/**
 * Hàng "Sửa · Xoá" dưới bài của chính mình, và biểu mẫu sửa tại chỗ.
 *
 * Sửa NGAY TẠI CHỖ chứ không mở trang riêng: người sửa bài phần lớn là sửa một
 * chữ gõ nhầm, mà đi một vòng sang trang khác rồi quay về thì đắt hơn nhiều
 * lần so với thứ thật sự thay đổi. Đổi lại, biểu mẫu phải giữ nguyên đúng
 * khoảng trống của bài cũ để trang không giật lên giật xuống lúc mở ra.
 */
export function SuaChuDe({ chuDeId, tieuDe, noiDung, xoaDuoc }: {
  chuDeId: string;
  tieuDe: string;
  noiDung: string;
  /** Chỉ xoá được khi chưa ai trả lời — xem chú thích ở `xoaChuDeCuaToi`. */
  xoaDuoc: boolean;
}) {
  const [mo, datMo] = useState(false);
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(
    async (truoc, form) => {
      const r = await suaChuDe(truoc, form);
      if (!r.loi) datMo(false);
      return r;
    },
    {},
  );
  const [dangXoa, batDauXoa] = useTransition();
  const [loiXoa, datLoiXoa] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();

  if (!mo) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => datMo(true)}
          className="text-[12px] font-semibold text-mo hover:text-chu hover:underline">
          Sửa bài
        </button>
        {xoaDuoc && (
          <button type="button" disabled={dangXoa}
            onClick={async () => {
              if (!(await hoi('Xoá hẳn chủ đề này?', true))) return;
              datLoiXoa(null);
              batDauXoa(async () => {
                const r = await xoaChuDeCuaToi(chuDeId);
                if (r?.loi) datLoiXoa(r.loi);
              });
            }}
            className="text-[12px] font-semibold text-mo hover:text-xau hover:underline">
            Xoá bài
          </button>
        )}
        {loiXoa && <span role="alert" className="text-[12px] font-medium text-xau">{loiXoa}</span>}
        {hop}
      </div>
    );
  }

  return (
    <form action={gui} className="mt-3 space-y-2">
      <input type="hidden" name="chuDeId" value={chuDeId} />
      <input name="tieuDe" defaultValue={tieuDe} required minLength={5} maxLength={150}
        aria-label="Tiêu đề" className="o-nhap" />
      <textarea name="noiDung" defaultValue={noiDung} required minLength={10} maxLength={8000}
        rows={6} aria-label="Nội dung" className="o-nhap" />
      {kq.loi && <p role="alert" className="text-[12px] font-medium text-xau">{kq.loi}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang lưu…' : 'Lưu bài'}
        </button>
        <button type="button" onClick={() => datMo(false)}
          className="text-[12px] font-semibold text-mo hover:underline">Thôi</button>
      </div>
    </form>
  );
}

export function SuaTraLoi({ traLoiId, noiDung }: { traLoiId: string; noiDung: string }) {
  const [mo, datMo] = useState(false);
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(
    async (truoc, form) => {
      const r = await suaTraLoi(truoc, form);
      if (!r.loi) datMo(false);
      return r;
    },
    {},
  );
  const [dangXoa, batDauXoa] = useTransition();
  const [loiXoa, datLoiXoa] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();

  if (!mo) {
    return (
      <div className="mt-2.5 flex items-center gap-3">
        <button type="button" onClick={() => datMo(true)}
          className="text-[12px] font-semibold text-mo hover:text-chu hover:underline">
          Sửa
        </button>
        <button type="button" disabled={dangXoa}
          onClick={async () => {
            if (!(await hoi('Xoá lời đáp này?', true))) return;
            datLoiXoa(null);
            batDauXoa(async () => {
              const r = await xoaTraLoiCuaToi(traLoiId);
              if (r?.loi) datLoiXoa(r.loi);
            });
          }}
          className="text-[12px] font-semibold text-mo hover:text-xau hover:underline">
          Xoá
        </button>
        {loiXoa && <span role="alert" className="text-[12px] font-medium text-xau">{loiXoa}</span>}
        {hop}
      </div>
    );
  }

  return (
    <form action={gui} className="mt-2.5 space-y-2">
      <input type="hidden" name="traLoiId" value={traLoiId} />
      <textarea name="noiDung" defaultValue={noiDung} required minLength={2} maxLength={8000}
        rows={4} aria-label="Nội dung lời đáp" className="o-nhap" />
      {kq.loi && <p role="alert" className="text-[12px] font-medium text-xau">{kq.loi}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" onClick={() => datMo(false)}
          className="text-[12px] font-semibold text-mo hover:underline">Thôi</button>
      </div>
    </form>
  );
}
