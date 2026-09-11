import './globals.css';
import { KhongThay } from '@/components/KhongThay';

/*
 * Trang 404 cho đường dẫn KHÔNG KHỚP tuyến nào.
 *
 * Dự án có hai bố cục gốc (cửa hàng và quản trị), nên ở mức trên cùng không
 * còn bố cục nào bọc lấy trang này — nó phải tự dựng lấy <html> và <body>,
 * bằng không Next trả về trang mặc định tiếng Anh không kiểu dáng.
 *
 * Không có thanh bên hay thanh tab ở đây, và đó là cố ý: chưa biết người ta
 * gõ nhầm khi đang ở khu nào, nên chỉ đưa ra mấy lối đi luôn đúng.
 */
export default function KhongKhopTuyenNao() {
  return (
    <html lang="vi">
      <body>
        <KhongThay />
      </body>
    </html>
  );
}
