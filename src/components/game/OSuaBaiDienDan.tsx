'use client';

import { useActionState, useState, useTransition } from 'react';
import { useXacNhan } from '@/components/HopXacNhan';
import { OSoanThao } from '@/components/OSoanThao';
import { ONhapGiu, OChuGiu } from '@/components/ONhapGiu';
import {
  suaChuDe, suaTraLoi, xoaChuDeCuaToi, xoaTraLoiCuaToi, type KetQua,
} from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';

/*
 * SỬA / XOÁ BÀI CỦA CHÍNH MÌNH.
 *
 * Sửa NGAY TẠI CHỖ chứ không mở trang riêng: người sửa bài phần lớn là sửa một
 * chữ gõ nhầm, mà đi một vòng sang trang khác rồi quay về thì đắt hơn nhiều
 * lần so với thứ thật sự thay đổi. Đổi lại, biểu mẫu phải giữ nguyên đúng
 * khoảng trống của bài cũ để trang không giật lên giật xuống lúc mở ra.
 *
 * LÚC CHƯA MỞ, HAI NÚT NÀY KHÔNG CÓ VỎ RIÊNG — chúng trả về một mảnh trần để
 * nơi gọi xếp thẳng vào hàng nút chung. Trước đây chúng tự bọc một `<div>` có
 * lề trên, nên bài của chính mình có HAI hàng nút ở hai độ thụt khác nhau,
 * trong khi bài của người khác chỉ có một — nhìn cả chủ đề là thấy lệch, mà
 * không chỉ ra được ngay vì sao.
 *
 * Lúc mở ra thì biểu mẫu chiếm nguyên một dòng (`w-full` trong hàng `flex-wrap`
 * của nơi gọi), vì một ô soạn thảo không chen cạnh mấy cái nút được.
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
      <>
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
      </>
    );
  }

  return (
    <form action={gui} className="mt-1 w-full space-y-2">
      <input type="hidden" name="chuDeId" value={chuDeId} />
      <ONhapGiu name="tieuDe" banDau={tieuDe} required minLength={5} maxLength={150}
        aria-label="Tiêu đề" className="o-nhap" />
      <OChuGiu name="noiDung" banDau={noiDung} required minLength={10} maxLength={8000}
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
      <>
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
      </>
    );
  }

  return (
    <form action={gui} className="mt-1 w-full space-y-2">
      <input type="hidden" name="traLoiId" value={traLoiId} />
      <OSoanThao ten="noiDung" nhan="Nội dung lời đáp" giaTri={noiDung} dong={4}
        gon choAnh="dien-dan" />
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
