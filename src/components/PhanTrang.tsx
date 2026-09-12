import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gop } from '@/lib/tien-ich';

/**
 * Thanh phân trang.
 *
 * Chỉ dựng khi có QUÁ MỘT trang: một thanh phân trang ghi "1" trên một danh
 * sách năm mục trông như trang bị cụt.
 *
 * Mỗi nút là một <Link> thật mang đầy đủ tham số lọc, không phải nút gọi
 * JavaScript: nhờ vậy bấm chuột giữa mở được tab mới, và địa chỉ trang 3 dán
 * cho người khác vẫn ra đúng trang 3.
 */
export function PhanTrang({ trang, tongTrang, dungDuong }: {
  trang: number;
  tongTrang: number;
  /** Nhận số trang, trả về đường dẫn đầy đủ (kèm mọi bộ lọc đang bật). */
  dungDuong: (t: number) => string;
}) {
  if (tongTrang <= 1) return null;

  // Chỉ in tối đa năm số quanh trang hiện tại: danh sách vài trăm trang mà in hết
  // thì thanh phân trang dài hơn cả danh sách nó phục vụ.
  const tu = Math.max(1, Math.min(trang - 2, tongTrang - 4));
  const den = Math.min(tongTrang, tu + 4);
  const so: number[] = [];
  for (let i = tu; i <= den; i++) so.push(i);

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Phân trang">
      {trang > 1 && (
        <Link href={dungDuong(trang - 1)} aria-label="Trang trước"
          className="grid size-9 place-items-center rounded-full text-mo hover:bg-nen3">
          <ChevronLeft size={18} />
        </Link>
      )}
      {so.map((t) => (
        <Link key={t} href={dungDuong(t)} aria-current={t === trang ? 'page' : undefined}
          className={gop(
            'grid size-9 place-items-center rounded-full text-[13px] tabular-nums transition-colors',
            t === trang ? 'bg-nhan font-bold text-white' : 'font-medium text-chu hover:bg-nen3',
          )}>
          {t}
        </Link>
      ))}
      {trang < tongTrang && (
        <Link href={dungDuong(trang + 1)} aria-label="Trang sau"
          className="grid size-9 place-items-center rounded-full text-mo hover:bg-nen3">
          <ChevronRight size={18} />
        </Link>
      )}
    </nav>
  );
}
