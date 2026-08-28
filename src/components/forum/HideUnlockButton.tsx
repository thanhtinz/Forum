'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Coins, LogIn } from 'lucide-react';
import { unlockThreadHide } from '@/app/(site)/forum/actions';
import { fmtCount } from '@/lib/utils';

/**
 * Nút trả điểm để mở khối `[hide=diem:N]` của chủ đề.
 *
 * Đặt ngay dưới bài mở đầu chứ không nhét vào chỗ khối ẩn: khối ẩn được thay
 * bằng một đoạn HTML dựng sẵn ở máy chủ, không cắm nút bấm vào đó được. Một
 * chủ đề có mấy khối ẩn thì vẫn chỉ một nút — trả một lần mở hết.
 */
export function HideUnlockButton({ threadId, price, myPoints, loggedIn, callbackUrl }: {
  threadId: string;
  price: number;
  myPoints?: number;
  loggedIn: boolean;
  callbackUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onUnlock = () => {
    setError(null);
    start(async () => {
      const r = await unlockThreadHide(threadId);
      if (r.error) { setError(r.error); return; }
      // Máy chủ đã làm mới trang; tải lại để phần ẩn hiện ra.
      window.location.reload();
    });
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-dashed border-amber-400 p-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-lg font-black text-ink-800 dark:text-ink-100">
        <Coins size={20} className="text-amber-500" /> {fmtCount(price)}
        <span className="text-sm font-semibold text-ink-500">điểm để xem phần ẩn</span>
      </p>

      {loggedIn ? (
        <>
          <button type="button" onClick={onUnlock} disabled={pending}
            className="btn-primary mt-3 !py-2 disabled:opacity-60">
            <Coins size={15} /> {pending ? 'Đang mở khoá…' : 'Dùng điểm để mở khoá'}
          </button>
          {myPoints != null && (
            <p className="retro-sub mt-1.5 text-ink-400">
              Bạn đang có {fmtCount(myPoints)} điểm
              {myPoints < price && <span className="text-red-500"> — còn thiếu {fmtCount(price - myPoints)}</span>}
            </p>
          )}
        </>
      ) : (
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary mt-3 !py-2">
          <LogIn size={15} /> Đăng nhập để mở khoá
        </Link>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
