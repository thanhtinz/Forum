'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Làm mới trang định kỳ để thấy tin nhắn mới mà không phải tự tải lại.
 *
 * Chỉ chạy khi tab đang hiển thị — nếu không, tab để quên vẫn gọi máy chủ
 * mãi. Quay lại tab thì làm mới ngay một lần cho khỏi phải chờ hết chu kỳ.
 */
export function LiveRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stop = () => {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    };
    const start = () => {
      stop();
      timer.current = setInterval(() => router.refresh(), Math.max(3, seconds) * 1000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') { router.refresh(); start(); }
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [router, seconds]);

  return null;
}
