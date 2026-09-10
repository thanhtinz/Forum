import { Apple, Coffee, Monitor, Smartphone } from 'lucide-react';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';

const ICON = { coffee: Coffee, smartphone: Smartphone, apple: Apple, monitor: Monitor };

/**
 * Dãy biểu tượng hệ máy một game có bản tải.
 *
 * Đây là câu hỏi THỨ HAI của mọi người sau "game gì" — "máy tôi chạy được
 * không". Nên nó phải trả lời được bằng cái liếc mắt, không bắt đọc chữ.
 */
export function HuyHieuHe({ heMay, co = 12 }: { heMay: MaHeMay[]; co?: number }) {
  if (heMay.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-mo">
      {heMay.map((h) => {
        const Icon = ICON[MO_TA_HE[h].icon];
        return <Icon key={h} size={co} aria-label={MO_TA_HE[h].ten} />;
      })}
    </span>
  );
}
