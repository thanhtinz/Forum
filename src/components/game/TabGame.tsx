'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { gop } from '@/lib/tien-ich';

/**
 * Hai tab của trang game: Thông tin | Diễn đàn.
 *
 * Là <Link> thật sang hai ĐƯỜNG DẪN khác nhau, không phải nút đổi trạng thái
 * trong một trang. Ba lẽ, và cả ba đều là chuyện người dùng gặp thật:
 *   • dán được địa chỉ khu diễn đàn của một game cho người khác;
 *   • nút Lùi của trình duyệt quay về đúng tab vừa xem, không văng khỏi trang;
 *   • máy tìm kiếm đọc được cả hai tab, chứ không chỉ tab mặc định.
 *
 * Gạch chân chạy DƯỚI tab đang chọn chứ không tô nền: đây là hai phần của
 * cùng một trang, không phải hai nút bấm rời — gạch chân nói đúng điều ấy.
 */
export function TabGame({ duongDanGame, soChuDe }: {
  duongDanGame: string;
  soChuDe: number;
}) {
  const dangO = usePathname();
  const goc = `/game/${duongDanGame}`;

  /*
   * ĐÁNH GIÁ KHÔNG CÓ TAB RIÊNG, cố ý.
   *
   * Đã có một đợt tách nó ra thành tab thứ ba, và đó là một bước lùi: tab
   * Thông tin vốn đã có mục đánh giá ở cuối, nên người dùng gặp đúng một thứ
   * ở hai chỗ và phải đoán xem hai chỗ ấy khác nhau ở đâu. Nay mục ấy bày năm
   * bài mới nhất, bấm "Xem tất cả" thì mở một tấm trượt đọc hết — không rời
   * trang, nên không mất chỗ đang đứng.
   */
  const tab = [
    { dich: goc, ten: 'Thông tin' },
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
