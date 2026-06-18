'use client';
import { useEffect, useState } from 'react';

// Trả về Date.now() cập nhật mỗi `interval` ms để hiển thị đếm ngược realtime
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
