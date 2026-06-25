'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, PenSquare, BookCheck } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { ThreadList } from '@/components/ThreadList';
import { useAuth } from '@/components/AuthProvider';

interface Cat { id: string; name: string; slug: string; description?: string | null; parentId?: string | null; iconUrl?: string | null; icon?: string | null; color?: string | null; minRolePost?: string }

function CategoryView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [cat, setCat] = useState<Cat | null>(null);
  const [parent, setParent] = useState<Cat | null>(null);

  useEffect(() => {
    if (!id) return;
    fetcher<Cat[]>('/forum/categories').then((all) => {
      const c = all.find((x) => x.id === id) || null;
      setCat(c);
      setParent(c?.parentId ? all.find((x) => x.id === c.parentId) || null : null);
    }).catch(() => {});
  }, [id]);

  // Quyền đăng: nếu danh mục chỉ cho BQT -> chỉ staff thấy nút đăng
  const staffOnly = cat?.minRolePost === 'MODERATOR' || cat?.minRolePost === 'ADMIN';
  const canPost = !!user && (!staffOnly || ['MODERATOR', 'ADMIN'].includes((user as any).role));
  const [markReadKey, setMarkReadKey] = useState(0);

  async function handleMarkAllRead() {
    await api.post('/forum/read-progress/mark-all', {}).catch(() => {});
    setMarkReadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={16} /> {parent ? parent.name : 'Trang chủ'}
      </Link>

      <section className="card overflow-hidden">
        {/* Top: chỉ icon + tên + mô tả */}
        <div className="flex items-center gap-3 border-b-2 border-ink-300 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-800/60">
          {cat?.iconUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cat.iconUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
            : <span className="grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: cat?.color || '#6366f1' }}>{cat?.icon?.trim() || cat?.name?.[0]?.toUpperCase() || '#'}</span>}
          <div>
            <h1 className="text-xl font-bold">{cat?.name || 'Danh mục'}</h1>
            {cat?.description && <p className="text-sm text-ink-500">{cat.description}</p>}
          </div>
        </div>
        {staffOnly && !canPost && (
          <p className="bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Danh mục này chỉ Ban quản trị được đăng bài.</p>
        )}
      </section>

      {/* Thanh hành động */}
      <div className="flex items-center justify-end gap-2">
        {user && (
          <button onClick={handleMarkAllRead} className="btn-outline inline-flex items-center gap-1.5 text-sm">
            <BookCheck size={15} /> Đánh dấu đã đọc
          </button>
        )}
        {canPost && (
          <Link href={`/threads/new?cat=${id}`} className="btn-primary inline-flex items-center gap-1.5 text-sm">
            <PenSquare size={16} /> Đăng chủ đề mới
          </Link>
        )}
      </div>

      {id ? <ThreadList categoryId={id} hideHeader markReadKey={markReadKey} /> : <div className="card p-8 text-center text-ink-500">Không tìm thấy danh mục.</div>}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <CategoryView />
    </Suspense>
  );
}
