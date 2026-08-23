'use client';

import { useEffect, useRef } from 'react';

/**
 * Cuộn xuống tin mới nhất khi mở hội thoại và sau mỗi lần danh sách đổi.
 * Đặt cuối khung tin nhắn, không vẽ gì cả.
 */
export function ScrollToLatest({ trigger }: { trigger: string | number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'end' });
  }, [trigger]);

  return <div ref={ref} aria-hidden />;
}
