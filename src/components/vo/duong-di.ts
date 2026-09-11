import type { LucideIcon } from 'lucide-react';
import { ArrowUpCircle, Gamepad2, Library, Search, Sparkles, Trophy } from 'lucide-react';

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

/*
 * BỐN tab, không phải năm.
 *
 * Bốn ô trên một hàng đáy điện thoại thì mỗi ô rộng chừng 90px — đủ chỗ cho
 * một biểu tượng và một chữ đọc được. Năm ô là mỗi ô còn 78px, chữ bắt đầu
 * phải cắt bớt. App Store cũng chỉ để ngần này ô ở đáy.
 *
 * Thư viện và tài khoản KHÔNG ở đây mà nằm sau ảnh đại diện góc trên phải —
 * đúng chỗ cả hai cửa hàng lớn để chúng, và cũng hợp lẽ: đó là việc của
 * riêng một người, không phải một lối duyệt kho.
 */
export const LOI_DI: LoiDi[] = [
  { duongDan: '/', ten: 'Hôm nay', icon: Sparkles },
  { duongDan: '/game', ten: 'Game', icon: Gamepad2 },
  { duongDan: '/bxh', ten: 'BXH', icon: Trophy },
  { duongDan: '/tim', ten: 'Tìm kiếm', icon: Search },
];

/** Mấy lối phụ chỉ hiện ở thanh bên máy bàn, không chen vào thanh tab đáy. */
export const LOI_PHU: LoiDi[] = [
  { duongDan: '/cap-nhat', ten: 'Bản cập nhật', icon: ArrowUpCircle, canDangNhap: true },
  { duongDan: '/thu-vien', ten: 'Thư viện', icon: Library, canDangNhap: true },
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
