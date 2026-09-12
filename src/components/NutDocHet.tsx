'use client';

import { useTransition } from 'react';
import { useXacNhan } from '@/components/HopXacNhan';
import { docHet, xoaDaDoc } from '@/app/(cua-hang)/thong-bao/viec';

/** Hai nút dọn danh sách thông báo. */
export function NutDonThongBao({ coChuaDoc, coDaDoc }: {
  coChuaDoc: boolean;
  coDaDoc: boolean;
}) {
  const [dangChay, batDau] = useTransition();
  const { hoi, hop } = useXacNhan();

  return (
    <div className="flex items-center gap-3">
      {/* Chỉ hiện khi thật sự có việc để làm: một nút "đọc hết" trên danh sách
          đã đọc hết thì bấm vào chẳng thấy gì đổi, và người bấm tưởng hỏng. */}
      {coChuaDoc && (
        <button type="button" disabled={dangChay}
          onClick={() => batDau(async () => { await docHet(); })}
          className="text-[13px] font-semibold text-nhan hover:underline">
          Đánh dấu đã đọc hết
        </button>
      )}
      {coDaDoc && (
        <button type="button" disabled={dangChay}
          onClick={async () => {
            if (!(await hoi('Xoá hết thông báo đã đọc?', true))) return;
            batDau(async () => { await xoaDaDoc(); });
          }}
          className="text-[13px] font-semibold text-mo hover:text-xau hover:underline">
          Xoá mục đã đọc
        </button>
      )}
      {hop}
    </div>
  );
}
