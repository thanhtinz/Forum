import Link from 'next/link';
import { SearchX } from 'lucide-react';

/**
 * Ruột của trang 404, dùng chung cho cả hai bố cục gốc.
 *
 * Có hai tệp `not-found` vì dự án có hai vỏ: một cho đường dẫn không khớp
 * tuyến nào, một cho `notFound()` gọi từ trong cửa hàng. Nội dung thì chỉ nên
 * có một bản — hai bản chữ là hai giọng nói, và sớm muộn lệch nhau.
 *
 * Câu chữ nói THỨ ĐÃ XẢY RA rồi chỉ lối đi tiếp, không xin lỗi và không đùa:
 * người đọc dòng này đang đi tìm một thứ và chưa thấy.
 */
export function KhongThay() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-nen3 text-mo">
        <SearchX size={26} aria-hidden />
      </span>
      <h1 className="tieu-de-trang mt-4">Không có trang này</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-mo">
        Đường dẫn có thể gõ nhầm, hoặc game đã được gỡ khỏi cửa hàng.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/game" className="nut-cai-dam">Xem tất cả game</Link>
        <Link href="/tim" className="nut-vien">Tìm game</Link>
      </div>
    </div>
  );
}
