'use client';

import { useEffect, useRef } from 'react';

/**
 * Cuộn xuống tin mới nhất khi mở hội thoại và sau mỗi lần danh sách đổi.
 * Đặt cuối khung tin nhắn, không vẽ gì cả.
 */
export function ScrollToLatest({ trigger, enabled = true }: { trigger: string | number; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Đang đọc tin cũ thì đừng kéo người dùng xuống đáy.
    if (enabled) ref.current?.scrollIntoView({ block: 'end' });
  }, [trigger, enabled]);

  return <div ref={ref} aria-hidden />;
}
