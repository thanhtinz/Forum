'use client';

import './globals.css';
import { CoLoi } from '@/components/CoLoi';

/*
 * Lưới cuối cùng: lỗi ném ra từ CHÍNH BỐ CỤC GỐC.
 *
 * Lúc ấy không còn `<html>` nào được dựng, nên tệp này phải tự dựng lấy — đó
 * là lý do nó khác hai tệp `error.tsx` kia. Không có thanh bên, không thanh
 * tab: mấy thứ ấy nằm trong đúng cái bố cục vừa hỏng.
 *
 * Hiếm khi chạy tới đây. Nhưng không có nó thì Next rơi về trang báo lỗi mặc
 * định tiếng Anh, không kiểu dáng — trái hẳn quy ước "mọi chữ trên giao diện
 * đều bằng tiếng Việt", và cũng là lúc trang trông hỏng nặng nhất.
 */
export default function LoiToanCuc({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <CoLoi thu={reset} digest={error.digest} />
      </body>
    </html>
  );
}
