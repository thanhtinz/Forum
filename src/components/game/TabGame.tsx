'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { gop } from '@/lib/tien-ich';

/**
 * Ba tab của trang game: Thông tin | Đánh giá | Diễn đàn.
 *
 * Là <Link> thật sang ba ĐƯỜNG DẪN khác nhau, không phải nút đổi trạng thái
 * trong một trang. Ba lẽ, và cả ba đều là chuyện người dùng gặp thật:
 *   • dán được địa chỉ khu diễn đàn của một game cho người khác;
 *   • nút Lùi của trình duyệt quay về đúng tab vừa xem, không văng khỏi trang;
 *   • máy tìm kiếm đọc được cả ba tab, chứ không chỉ tab mặc định.
 *
 * Gạch chân chạy DƯỚI tab đang chọn chứ không tô nền: đây là ba phần của
 * cùng một trang, không phải ba nút bấm rời — gạch chân nói đúng điều ấy.
 */
export function TabGame({ duongDanGame, soChuDe, soDanhGia }: {
  duongDanGame: string;
  soChuDe: number;
  soDanhGia: number;
}) {
  const dangO = usePathname();
  const goc = `/game/${duongDanGame}`;

  /*
   * Đánh giá có tab riêng vì tab Thông tin chỉ khoe được sáu bài mới nhất.
   * Một game nghìn lượt đánh giá thì 994 bài còn lại trước đây không có lối
   * nào đọc được — mà đọc người khác nói gì chính là việc người ta vào cửa
   * hàng để làm trước khi bấm tải.
   */
  const tab = [
    { dich: goc, ten: 'Thông tin' },
    { dich: `${goc}/danh-gia`, ten: 'Đánh giá', so: soDanhGia },
    { dich: `${goc}/dien-dan`, ten: 'Diễn đàn', so: soChuDe },
  ];

  return (
    <nav className="vach flex gap-6 border-b" aria-label="Phần của trang game">
      {tab.map((t) => {
        // Trang một chủ đề cũng nằm trong khu diễn đàn, nên tab ấy phải sáng.
        const chon = t.dich === goc ? dangO === goc : dangO.startsWith(t.dich);
        return (
          <Link key={t.dich} href={t.dich} aria-current={chon ? 'page' : undefined}
            className={gop(
              'relative -mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[14px] transition-colors',
              chon ? 'border-nhan font-bold text-nhan' : 'border-transparent font-medium text-mo hover:text-chu',
            )}>
            {t.ten}
            {t.so != null && t.so > 0 && (
              <span className={gop('rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                chon ? 'bg-nhan/12 text-nhan' : 'bg-nen3 text-mo')}>
                {t.so}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
