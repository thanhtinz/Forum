'use client';

import { useEffect, useRef } from 'react';
import { recordGameView } from '@/app/(site)/games/actions';

/**
 * Ghi nhận lượt xem trang chi tiết từ phía client.
 *
 * Đặt ở client thay vì trong render server để bot/prefetch không thổi phồng số
 * liệu, và để `dynamic = 'force-dynamic'` không phải gánh thêm ghi DB.
 */
export function GameViewTracker({ gameId, slug }: { gameId: string; slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const t = setTimeout(() => { void recordGameView(gameId, slug); }, 1200);
    return () => clearTimeout(t);
  }, [gameId, slug]);
  return null;
}
