'use client';

import { useEffect } from 'react';

// Đăng ký service worker khi tải app để cài được như app (PWA)
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const t = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
