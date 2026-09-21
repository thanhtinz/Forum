import Link from 'next/link';
import { TRANG_TINH } from '@/lib/trang-tinh-const';

/**
 * CHÂN TRANG của mặt tiền cửa hàng.
 *
 * Trước đây mặt tiền KHÔNG có chân trang nào. Dòng liên hệ và dòng bản quyền
 * chỉ nằm ở đáy thanh bên máy bàn, mà thanh bên ẩn hẳn dưới `lg` — nên người
 * dùng điện thoại, tức là phần lớn người vào một cửa hàng game, không bao giờ
 * thấy cửa hàng này là của ai.
 *
 * Đó không phải chuyện thẩm mỹ: chỗ này cho người lạ tải tệp thực thi về máy
 * họ. Ai đứng sau, luật chơi là gì, hỏng thì báo ai — ba câu ấy phải có chỗ
 * trả lời, và phải trả lời ở mọi khổ màn hình.
 *
 * Đặt trong bố cục nên mọi trang đều có, và nằm SAU phần nội dung chính để bộ
 * đọc màn hình gặp nó sau cùng, đúng chỗ người ta trông đợi.
 */
export function ChanTrang({ tenTrang }: { tenTrang: string }) {
  return (
    <footer className="vach mt-10 border-t px-4 py-7 sm:px-6">
      <nav aria-label="Lối đi phụ" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {TRANG_TINH.map((t) => (
          <Link key={t.duongDan} href={t.duongDan} className="phu hover:text-nhan hover:underline">
            {t.ten}
          </Link>
        ))}
      </nav>
      <p className="phu mt-3 text-center">
        © {new Date().getFullYear()} {tenTrang}
      </p>
    </footer>
  );
}
