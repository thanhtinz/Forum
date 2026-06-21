'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '@/lib/api';

interface Banner { id: string; title: string; imageUrl: string; linkUrl?: string | null }

// Khu quảng cáo theo vị trí. Có banner hiệu lực → hiện (xoay vòng nếu nhiều);
// chưa cấu hình → hiện ô "cho thuê quảng cáo".
export function AdBanner({ position, className = '' }: { position: string; className?: string }) {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.get<Banner[]>(`/banners?position=${encodeURIComponent(position)}`).then(setBanners).catch(() => setBanners([]));
  }, [position]);

  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners]);

  // đang tải
  if (banners === null) return null;

  // chưa có banner → ô cho thuê
  if (banners.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center text-ink-400 dark:border-ink-700 dark:bg-ink-800/40 ${className}`}>
        <Megaphone size={22} />
        <span className="text-sm font-semibold">Khu vực quảng cáo</span>
        <span className="text-xs">Vị trí trống — liên hệ admin để thuê đặt banner</span>
      </div>
    );
  }

  const b = banners[idx % banners.length];
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={b.imageUrl} alt={b.title} className="h-full w-full rounded-2xl object-cover" />
  );
  return (
    <div className={`overflow-hidden rounded-2xl ${className}`}>
      {b.linkUrl
        ? <a href={b.linkUrl} target="_blank" rel="noopener noreferrer sponsored" title={b.title} className="block">{img}</a>
        : img}
    </div>
  );
}
