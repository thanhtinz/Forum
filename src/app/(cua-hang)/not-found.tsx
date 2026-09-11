import type { Metadata } from 'next';
import { KhongThay } from '@/components/KhongThay';

export const metadata: Metadata = { title: 'Không có trang này' };

/** Bắt `notFound()` gọi từ các trang cửa hàng — giữ nguyên thanh bên và tab đáy. */
export default function KhongThayTrongCuaHang() {
  return <KhongThay />;
}
