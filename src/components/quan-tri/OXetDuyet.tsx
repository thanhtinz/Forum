'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { duyetGame, tuChoiGame } from '@/app/(quan-tri)/quan-tri/viec';
import { useXacNhan } from '@/components/HopXacNhan';

/*
 * Hai nút quyết định của hàng chờ: duyệt, hoặc trả lại kèm lý do.
 *
 * Ô lý do chỉ mở ra khi bấm "Trả lại" — bày sẵn một ô chữ to bên cạnh nút
 * duyệt thì trang thành một mớ biểu mẫu, trong khi phần lớn lượt xét là duyệt.
 */
export function OXetDuyet({ gameId, ten }: { gameId: string; ten: string }) {
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
          if (await hoi(`Duyệt “${ten}” và bày ra cửa hàng?`)) lam(() => duyetGame(gameId));
        }}
        className="nut-cai-dam !min-h-[34px] !px-3 !text-[13px]">
        <Check size={14} aria-hidden /> Duyệt
      </button>

      <button type="button" disabled={dangChay} onClick={() => datMoLyDo((v) => !v)}
        className="nut-vien !min-h-[34px] !px-3 !text-[13px] !text-xau">
        <X size={14} aria-hidden /> Trả lại
      </button>

      {moLyDo && (
        <div className="basis-full pt-2">
          <label className="block">
            <span className="phu mb-1 block">Vì sao trả lại — tác giả sẽ đọc đúng câu này</span>
            <textarea value={lyDo} onChange={(e) => datLyDo(e.target.value)} rows={3}
              className="o-nhap" placeholder="Ví dụ: tệp JAR tải về bị lỗi, mở không lên trên máy S40." />
          </label>
          <button type="button" disabled={dangChay}
            onClick={() => lam(() => tuChoiGame(gameId, lyDo))}
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
