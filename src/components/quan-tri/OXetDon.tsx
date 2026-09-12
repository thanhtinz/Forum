'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { duyetDonTacGia, tuChoiDonTacGia } from '@/app/(quan-tri)/quan-tri/viec';
import { useXacNhan } from '@/components/HopXacNhan';

/*
 * Hai nút quyết định của một đơn tác giả: đồng ý, hoặc trả lại kèm lý do.
 *
 * Cùng dáng với `OXetDuyet` của hàng chờ game, và cố ý giống: người trực đi
 * qua hai hàng chờ ấy trong cùng một buổi, mà hai hàng chờ trông khác nhau thì
 * họ phải học lại cách bấm ở mỗi chỗ.
 *
 * Ô lý do chỉ mở khi bấm "Trả lại": phần lớn lượt xét là đồng ý, nên bày sẵn
 * một ô chữ to cạnh nút đồng ý chỉ làm rối mắt.
 */
export function OXetDon({ donId, ten }: { donId: string; ten: string }) {
  const [moLyDo, datMoLyDo] = useState(false);
  const [lyDo, datLyDo] = useState('');
  const [loi, datLoi] = useState<string | null>(null);
  const [dangChay, batDau] = useTransition();
  const { hoi, hop } = useXacNhan();

  const lam = (viec: () => Promise<{ loi?: string }>) => {
    datLoi(null);
    batDau(async () => {
      const kq = await viec();
      if (kq?.loi) datLoi(kq.loi);
      else datMoLyDo(false);
    });
  };

  return (
    <>
      <button type="button" disabled={dangChay}
        onClick={async () => {
          if (await hoi(`Cho ${ten} quyền tác giả? Họ sẽ tự thêm game và gửi duyệt được.`)) {
            lam(() => duyetDonTacGia(donId));
          }
        }}
        className="nut-cai-dam !min-h-[34px] !px-3 !text-[13px]">
        <Check size={14} aria-hidden /> Đồng ý
      </button>

      <button type="button" disabled={dangChay} onClick={() => datMoLyDo((v) => !v)}
        className="nut-vien !min-h-[34px] !px-3 !text-[13px] !text-xau">
        <X size={14} aria-hidden /> Trả lại
      </button>

      {moLyDo && (
        <div className="basis-full pt-2">
          <label className="block">
            <span className="phu mb-1 block">Vì sao trả lại — người gửi đọc đúng câu này</span>
            <textarea value={lyDo} onChange={(e) => datLyDo(e.target.value)} rows={3}
              className="o-nhap"
              placeholder="Ví dụ: chưa rõ bạn định đăng game gì, kể thêm vài dòng rồi gửi lại giúp mình." />
          </label>
          <button type="button" disabled={dangChay}
            onClick={() => lam(() => tuChoiDonTacGia(donId, lyDo))}
            className="nut-xam mt-2 !min-h-[34px] !px-3 !text-[13px]">
            {dangChay ? 'Đang gửi…' : 'Gửi lý do và trả lại'}
          </button>
        </div>
      )}

      {loi && <p role="alert" className="basis-full text-[12px] font-medium text-xau">{loi}</p>}
      {hop}
    </>
  );
}
