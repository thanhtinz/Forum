import type { MouseEvent } from 'react';

// Bắt click vào link ngoài trong nội dung (bài viết, trang) → đưa qua trang cảnh báo /go có đếm ngược.
// Gắn vào onClick của container render HTML (dangerouslySetInnerHTML).
export function interceptExternalLink(e: MouseEvent<HTMLElement>) {
  const a = (e.target as HTMLElement)?.closest?.('a');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('/go?')) return;
  try {
    const u = new URL(href, window.location.origin);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && u.host !== window.location.host) {
      e.preventDefault();
      window.location.assign(`/go?url=${encodeURIComponent(u.href)}`);
    }
  } catch { /* link nội bộ/không hợp lệ → để mặc định */ }
}
