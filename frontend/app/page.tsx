'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThreadList } from '@/components/ThreadList';
import { CategoryList } from '@/components/CategoryList';
import { HomeSidebar } from '@/components/HomeSidebar';

function HomeContent() {
  const cat = useSearchParams().get('cat') || '';

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-card sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Chào mừng đến ForumHub</h1>
        <p className="mt-1 max-w-xl text-white/85">
          Diễn đàn cộng đồng tích hợp game hoá — chia sẻ, thảo luận, chơi game và mua bán source code.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {cat && (
            <Link href="/" className="inline-flex items-center text-sm text-brand-600 hover:underline">← Xem tất cả danh mục</Link>
          )}
          {/* 1. Bài viết mới của tất cả danh mục */}
          <ThreadList categoryId={cat || undefined} />
          {/* 2. Danh mục kiểu XenForo (ẩn khi đang lọc 1 danh mục) */}
          {!cat && <CategoryList />}
        </div>

        <HomeSidebar />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="card p-10 text-center text-ink-500">Đang tải…</div>}>
      <HomeContent />
    </Suspense>
  );
}
