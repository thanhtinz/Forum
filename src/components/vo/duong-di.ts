import type { LucideIcon } from 'lucide-react';
import { Compass, Library, LayoutGrid, Search, User } from 'lucide-react';

/**
 * Năm lối đi chính của trang, khai báo MỘT chỗ.
 *
 * Thanh bên (màn hình rộng) và thanh tab đáy (điện thoại) đọc chung danh sách
 * này. Trước giờ mỗi chỗ giữ một bản riêng là kiểu gì cũng có ngày thêm mục ở
 * chỗ này mà quên chỗ kia, rồi hai thiết bị nhìn thấy hai trang web khác nhau.
 */
export interface LoiDi {
  duongDan: string;
  ten: string;
  icon: LucideIcon;
  /** Chỉ hiện khi đã đăng nhập. */
  canDangNhap?: boolean;
}

export const LOI_DI: LoiDi[] = [
  { duongDan: '/', ten: 'Kho game', icon: LayoutGrid },
  { duongDan: '/duyet', ten: 'Duyệt', icon: Compass },
  { duongDan: '/tim', ten: 'Tìm', icon: Search },
  { duongDan: '/thu-vien', ten: 'Thư viện', icon: Library, canDangNhap: true },
  { duongDan: '/toi', ten: 'Tôi', icon: User },
];

/**
 * Mục nào đang được chọn.
 *
 * Không so bằng dấu bằng: đang ở `/duyet?he=JAVA` hay `/game/contra-4` thì mục
 * tương ứng vẫn phải sáng. Riêng `/` phải so khớp tuyệt đối, không thì nó sáng
 * ở mọi trang vì trang nào cũng bắt đầu bằng dấu gạch chéo.
 */
export function dangO(duongDanHienTai: string, muc: string): boolean {
  if (muc === '/') return duongDanHienTai === '/';
  return duongDanHienTai === muc || duongDanHienTai.startsWith(`${muc}/`);
}
