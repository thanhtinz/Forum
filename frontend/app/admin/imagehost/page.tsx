'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Đã gộp vào trang Lưu trữ R2 duy nhất
export default function AdminImageHostRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/attachment'); }, [router]);
  return <div className="p-10 text-center text-ink-500">Đang chuyển tới Lưu trữ R2…</div>;
}
