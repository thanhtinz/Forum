'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Coins, Lock, LogIn, Package } from 'lucide-react';
import { unlockGame } from '@/app/(site)/games/actions';
import { fmtCount } from '@/lib/utils';

/**
 * Khung thay chỗ phần tải xuống khi game có đặt giá bằng điểm.
 *
 * Không bao giờ nhận danh sách tệp: trang chỉ dựng khung này KHI chưa có
 * quyền, nên đường tải thật không hề đi xuống trình duyệt để mà mò ra.
 */
export function GameUnlockBox({ gameId, price, loggedIn, myPoints, callbackUrl }: {
  gameId: string;
  price: number;
  loggedIn: boolean;
  myPoints?: number;
  callbackUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onUnlock = () => {
    setError(null);
    start(async () => {
      const r = await unlockGame(gameId);
      if (r.error) { setError(r.error); return; }
      // Máy chủ đã làm mới trang; tải lại để phần tải xuống hiện ra.
      window.location.reload();
    });
  };

  return (
    <div className="card p-4 sm:p-5" id="download">
      <h3 className="zib-title mb-4 flex items-center gap-2"><Package size={18} /> Tải game</h3>

      <div className="rounded-xl border-2 border-dashed border-amber-400 p-4 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50">
          <Lock size={20} />
        </span>
        <p className="mt-2.5 text-sm text-ink-500">Phần tải xuống của game này cần mở khoá bằng điểm.</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-2xl font-black text-ink-800 dark:text-ink-100">
          <Coins size={22} className="text-amber-500" /> {fmtCount(price)}
          <span className="text-base font-semibold text-ink-500">điểm</span>
        </p>

        {loggedIn ? (
          <>
            <button type="button" onClick={onUnlock} disabled={pending}
              className="btn-primary mt-3 w-full !py-2.5 disabled:opacity-60">
              <Coins size={16} /> {pending ? 'Đang mở khoá…' : 'Dùng điểm để mở khoá'}
            </button>
            {myPoints != null && (
              <p className="retro-sub mt-1.5 text-ink-400">
                Bạn đang có {fmtCount(myPoints)} điểm
                {myPoints < price && <span className="text-red-500"> — còn thiếu {fmtCount(price - myPoints)}</span>}
              </p>
            )}
          </>
        ) : (
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary mt-3 w-full !py-2.5">
            <LogIn size={16} /> Đăng nhập để mở khoá
          </Link>
        )}

        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <p className="retro-sub mt-3 text-center text-ink-400">
        Mở khoá một lần, tải mãi mãi. Điểm kiếm được bằng hoạt động trên diễn đàn.
      </p>
    </div>
  );
}
