'use client';

import { CoLoi } from '@/components/CoLoi';

/**
 * Bắt lỗi ném ra từ bất kỳ trang nào của cửa hàng.
 *
 * Giữ nguyên thanh bên và thanh tab đáy: lỗi ở một trang không có nghĩa là mất
 * luôn lối đi sang trang khác, mà đó lại đúng là thứ người ta cần ngay lúc ấy.
 */
export default function LoiCuaHang({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CoLoi thu={reset} digest={error.digest} />;
}
