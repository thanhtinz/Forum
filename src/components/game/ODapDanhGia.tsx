'use client';

import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { NutCamXuc } from '@/components/BangCamXuc';
import { napAnh } from '@/components/quan-tri/ONapAnh';

/**
 * Ô trả lời một bài đánh giá.
 *
 * Mặc định gấp lại thành một dòng chữ nhỏ: trang game là chỗ người chơi đọc,
 * nên công cụ của người bán hàng không được chiếm chỗ của nội dung. Mở ra thì
 * mới thành ô chữ.
 *
 * VIỆC GHI TRUYỀN TỪ NGOÀI VÀO, vì nay có hai người đáp được: ban quản trị đáp
 * mọi bài trong cửa hàng, tác giả chỉ đáp bài của game mình. Hai việc ấy kiểm
 * quyền khác nhau nên phải là hai hàm khác nhau — còn cái ô chữ thì vẫn là một
 * cái ô chữ, chép ra hai bản chỉ tổ sửa một bên quên bên kia.
 */
export function ODapDanhGia({ danhGiaId, banDau, banDauAnh, dap }: {
  danhGiaId: string;
  banDau: string | null;
  /*
   * BẮT BUỘC, không để tuỳ chọn.
   *
   * Để `?` thì nơi gọi quên truyền vẫn dựng được, mà quên ở đây nghĩa là ô sửa
   * mở ra với cột ảnh RỖNG — người trực bấm Lưu là tấm ảnh trong lời đáp cũ
   * lặng lẽ biến mất. Đã quên thật ở hai trang, và trình biên dịch không nói
   * được một câu nào vì dấu `?` ấy. Bắt buộc thì mỗi trang mới thêm phải tự
   * nghĩ xem cột ảnh lấy ở đâu ra.
   */
  banDauAnh: string | null;
  dap: (danhGiaId: string, loi: string, anh?: string) => Promise<{ loi?: string }>;
}) {
  const [mo, datMo] = useState(false);
  const [chu, datChu] = useState(banDau ?? '');
  const [anh, datAnh] = useState(banDauAnh ?? '');
  const [dangNapAnh, datDangNapAnh] = useState(false);
  const oAnh = useRef<HTMLInputElement>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangGui, batDau] = useTransition();

  if (!mo) {
    return (
      <button type="button" onClick={() => datMo(true)}
        className="mt-2 text-[12px] font-semibold text-mo hover:text-nhan hover:underline">
        {banDau ? 'Sửa lời trả lời' : 'Trả lời bài này'}
      </button>
    );
  }

  const gui = () => {
    datLoi(null);
    batDau(async () => {
      const kq = await dap(danhGiaId, chu, anh);
      if (kq.loi) datLoi(kq.loi);
      else datMo(false);
    });
  };

  const napTep = async (tep: File | null | undefined) => {
    if (!tep) return;
    datLoi(null);
    datDangNapAnh(true);
    const kq = await napAnh(tep, 'dien-dan');
    datDangNapAnh(false);
    if (oAnh.current) oAnh.current.value = '';
    if (kq.loi) { datLoi(kq.loi); return; }
    datAnh(kq.duongDan ?? '');
  };

  return (
    <div className="mt-2 space-y-2">
      <textarea value={chu} onChange={(e) => datChu(e.target.value)} rows={3} maxLength={1000}
        aria-label="Lời trả lời của cửa hàng" placeholder="Cảm ơn bạn đã góp ý…"
        className="o-nhap" />

      <div className="flex items-center gap-1.5">
        <NutCamXuc xuong
          chonEmoji={(h) => datChu((c) => (c + h).slice(0, 1000))}
          chonAnh={(d) => datAnh(d)} />
        <button type="button" onClick={() => oAnh.current?.click()} disabled={dangNapAnh}
          aria-label="Đính ảnh vào lời trả lời"
          className="grid size-[34px] shrink-0 place-items-center rounded-nut text-mo transition-colors hover:bg-nen3 hover:text-chu disabled:opacity-50">
          {dangNapAnh
            ? <Loader2 size={17} className="animate-spin" aria-hidden />
            : <ImagePlus size={17} aria-hidden />}
        </button>
        <input ref={oAnh} type="file" accept="image/*" className="sr-only"
          aria-label="Chọn ảnh cho lời trả lời"
          onChange={(e) => void napTep(e.target.files?.[0])} />
      </div>

      {anh && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anh} alt="" className="max-h-28 rounded-nut border border-vien" />
          <button type="button" onClick={() => datAnh('')} aria-label="Bỏ ảnh đính kèm"
            className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-xau-dac text-white">
            <X size={12} aria-hidden />
          </button>
        </div>
      )}

      {loi && (
        <p role="alert" className="text-[12px] font-medium text-xau">{loi}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={gui} disabled={dangGui} className="nut-xam">
          {dangGui ? 'Đang lưu…' : 'Lưu lời trả lời'}
        </button>
        <button type="button"
          onClick={() => { datMo(false); datChu(banDau ?? ''); datAnh(banDauAnh ?? ''); }}
          className="text-[12px] font-semibold text-mo hover:underline">
          Thôi
        </button>
        {/* Xoá = lưu chuỗi rỗng, nên chỉ mời bấm khi đang thật có lời đáp —
            mà một lời đáp CHỈ CÓ ẢNH cũng là một lời đáp, nên phải xét cả hai
            cột. Xét mỗi phần chữ thì lời đáp ảnh không có đường nào gỡ. */}
        {(banDau || banDauAnh) && (
          <button type="button" disabled={dangGui}
            onClick={() => {
              datChu(''); datAnh('');
              batDau(async () => { await dap(danhGiaId, '', ''); datMo(false); });
            }}
            className="ml-auto text-[12px] font-semibold text-xau hover:underline">
            Xoá lời trả lời
          </button>
        )}
      </div>
    </div>
  );
}
