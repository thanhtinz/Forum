'use client';

import { useState, useTransition } from 'react';
import { gop } from '@/lib/tien-ich';

/**
 * Nút chạy một việc ở máy chủ, có thể bắt XÁC NHẬN trước.
 *
 * Gom vào một chỗ vì khu quản trị có cả chục nút kiểu này — ghim, khoá, xoá —
 * và mỗi chỗ tự viết lấy `useTransition` cùng phần bắt lỗi thì sớm muộn có
 * chỗ quên mất phần bắt lỗi, rồi việc hỏng mà nút vẫn im như không.
 *
 * `xacNhan` dùng `window.confirm` chứ không dựng hộp thoại riêng: hộp thoại
 * của trình duyệt CHẶN hẳn luồng, nên không có cảnh bấm nhầm hai lần trong
 * lúc hộp đang mở. Với thao tác xoá thì chặn hẳn là đúng thứ cần.
 */
export function NutViec({ lam, nhan, xacNhan, kieu = 'thuong', nho, className }: {
  lam: () => Promise<{ loi?: string }>;
  nhan: React.ReactNode;
  /** Câu hỏi xác nhận. Bỏ trống thì bấm là chạy luôn. */
  xacNhan?: string;
  kieu?: 'thuong' | 'nguyHiem';
  /** Nhãn đọc được, khi `nhan` chỉ là một hình. */
  nho?: string;
  className?: string;
}) {
  const [dangChay, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);

  const bam = () => {
    if (xacNhan && !window.confirm(xacNhan)) return;
    datLoi(null);
    batDau(async () => {
      const kq = await lam();
      if (kq?.loi) datLoi(kq.loi);
    });
  };

  return (
    <>
      <button type="button" onClick={bam} disabled={dangChay} aria-label={nho}
        className={gop(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50',
          kieu === 'nguyHiem' ? 'text-mo hover:bg-xau/10 hover:text-xau' : 'text-mo hover:bg-nen3 hover:text-chu',
          className,
        )}>
        {nhan}
      </button>
      {loi && <p role="alert" className="mt-1 text-[12px] font-medium text-xau">{loi}</p>}
    </>
  );
}
