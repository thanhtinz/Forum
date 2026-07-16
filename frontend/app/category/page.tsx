'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, PenSquare, BookCheck, MessageSquare, FileText } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { ThreadList } from '@/components/ThreadList';
import { useAuth } from '@/components/AuthProvider';

interface Cat { id: string; name: string; slug: string; description?: string | null; parentId?: string | null; iconUrl?: string | null; icon?: string | null; color?: string | null; minRolePost?: string; threadCount?: number; postCount?: number }

function fmt(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

function CategoryView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [cat, setCat] = useState<Cat | null>(null);
  const [parent, setParent] = useState<Cat | null>(null);
  const [children, setChildren] = useState<Cat[]>([]);

  useEffect(() => {
    if (!id) return;
    fetcher<Cat[]>('/forum/categories').then((all) => {
      const c = all.find((x) => x.id === id) || null;
      setCat(c);
      setParent(c?.parentId ? all.find((x) => x.id === c.parentId) || null : null);
      setChildren(all.filter((x) => x.parentId === id));
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
        {/* Header danh mục: icon + tên + mô tả + số liệu + nút đăng bài */}
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink-300 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-800/60">
          {cat?.iconUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cat.iconUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: cat?.color || '#6366f1' }}>{cat?.icon?.trim() || cat?.name?.[0]?.toUpperCase() || '#'}</span>}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{cat?.name || 'Danh mục'}</h1>
            {cat?.description
              ? <p className="text-sm text-ink-500">{cat.description}</p>
              : <p className="flex items-center gap-3 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {fmt(cat?.threadCount)} chủ đề</span>
                  <span className="flex items-center gap-1"><FileText size={12} /> {fmt(cat?.postCount)} bài viết</span>
                </p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user && (
              <button onClick={handleMarkAllRead} className="btn-outline inline-flex items-center gap-1.5 text-sm">
                <BookCheck size={15} /> <span className="hidden sm:inline">Đã đọc</span>
              </button>
            )}
            {canPost && (
              <Link href={`/threads/new?cat=${id}`} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                <PenSquare size={16} /> Đăng chủ đề
              </Link>
            )}
          </div>
        </div>

        {cat?.description && (
          <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-2 text-xs text-ink-400 dark:border-ink-800">
            <span className="flex items-center gap-1"><MessageSquare size={12} /> {fmt(cat?.threadCount)} chủ đề</span>
            <span className="flex items-center gap-1"><FileText size={12} /> {fmt(cat?.postCount)} bài viết</span>
          </div>
        )}

        {/* Danh mục con (nếu có) */}
        {children.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {children.map((ch) => (
              <Link key={ch.id} href={`/category?id=${ch.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-sm hover:border-brand-400 hover:text-brand-600 dark:border-ink-700">
                <span className="grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: ch.color || '#6366f1' }}>{ch.icon?.trim() || ch.name?.[0]?.toUpperCase() || '#'}</span>
                {ch.name}
              </Link>
            ))}
          </div>
        )}

        {staffOnly && !canPost && (
          <p className="bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Danh mục này chỉ Ban quản trị được đăng bài.</p>
        )}
      </section>

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
