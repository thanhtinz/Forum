'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Đã gộp vào Seller Center — chuyển hướng sang /seller/shop
export default function ManageStoreRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/seller/shop'); }, [router]);
  return <div className="p-10 text-center text-ink-500">Đang chuyển tới Seller Center…</div>;
}
