'use client';

import { useState, useTransition } from 'react';

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
export function ODapDanhGia({ danhGiaId, banDau, dap }: {
  danhGiaId: string;
  banDau: string | null;
  dap: (danhGiaId: string, loi: string) => Promise<{ loi?: string }>;
}) {
  const [mo, datMo] = useState(false);
  const [chu, datChu] = useState(banDau ?? '');
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
      const kq = await dap(danhGiaId, chu);
      if (kq.loi) datLoi(kq.loi);
      else datMo(false);
    });
  };

  return (
    <div className="mt-2 space-y-2">
      <textarea value={chu} onChange={(e) => datChu(e.target.value)} rows={3} maxLength={1000}
        aria-label="Lời trả lời của cửa hàng" placeholder="Cảm ơn bạn đã góp ý…"
        className="o-nhap" />

      {loi && (
        <p role="alert" className="text-[12px] font-medium text-xau">{loi}</p>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={gui} disabled={dangGui} className="nut-xam">
          {dangGui ? 'Đang lưu…' : 'Lưu lời trả lời'}
        </button>
        <button type="button" onClick={() => { datMo(false); datChu(banDau ?? ''); }}
          className="text-[12px] font-semibold text-mo hover:underline">
          Thôi
        </button>
        {/* Xoá = lưu chuỗi rỗng, nên chỉ mời bấm khi đang thật có lời đáp. */}
        {banDau && (
          <button type="button" disabled={dangGui}
            onClick={() => { datChu(''); batDau(async () => { await dap(danhGiaId, ''); datMo(false); }); }}
            className="ml-auto text-[12px] font-semibold text-xau hover:underline">
            Xoá lời trả lời
          </button>
        )}
      </div>
    </div>
  );
}
