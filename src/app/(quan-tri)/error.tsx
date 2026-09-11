'use client';

import { CoLoi } from '@/components/CoLoi';

/** Bắt lỗi trong khu quản trị. Cùng một bản nội dung với cửa hàng. */
export default function LoiQuanTri({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CoLoi thu={reset} digest={error.digest} />;
}
