import Link from 'next/link';
import { gop } from '@/lib/tien-ich';

/**
 * Hàng chip lọc ngay dưới thanh tìm.
 *
 * CH Play đặt đúng hàng này ở đầu mọi tab. Nó là lối tắt cho người đã biết
 * mình muốn LOẠI gì mà chưa biết muốn game nào — nhóm đông nhất trong số người
 * mở cửa hàng ra mà chưa gõ gì vào ô tìm.
 *
 * Cuộn ngang chứ không xuống dòng: xuống dòng thì mười cái chip ăn ba hàng,
 * đẩy hết game xuống dưới màn hình đầu tiên.
 */
export function HangChip({ muc, dangChon }: {
  muc: { ten: string; duongDan: string }[];
  dangChon?: string;
}) {
  if (muc.length === 0) return null;

  return (
    <div className="ke -mx-4 gap-2 px-4 pb-1 sm:mx-0 sm:px-0">
      {muc.map((m) => (
        <Link key={m.duongDan} href={m.duongDan}
          className={gop('chip', dangChon === m.duongDan && 'chip-chon')}>
          {m.ten}
        </Link>
      ))}
    </div>
  );
}
