'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, User, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Category { id: string; name: string; slug: string }

function SearchView() {
  const q = useSearchParams().get('q') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'all' | 'thread' | 'post' | 'user'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => { api.get<Category[]>('/forum/categories').then(setCategories).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [q, type, author, categoryId, from, to]);

  useEffect(() => {
    if (q.trim().length < 2) { setData(null); return; }
    setLoading(true);
    const params = new URLSearchParams({ q, type, page: String(page), limit: '10' });
    if (author.trim()) params.set('author', author.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api.get<any>(`/search?${params.toString()}`).then((d) => setData(d.results || {})).catch(() => setData({})).finally(() => setLoading(false));
  }, [q, type, page, author, categoryId, from, to]);

  const r = data || {};
  const empty = data && !r.threads?.length && !r.posts?.length && !r.users?.length;
  const hasMore = (r.threads?.length ?? 0) >= 10 || (r.posts?.length ?? 0) >= 10 || (r.users?.length ?? 0) >= 10;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Kết quả cho "{q}"</h1>
        <button onClick={() => setShowFilters((s) => !s)} className="btn-outline inline-flex items-center gap-1.5 text-sm">
          <SlidersHorizontal size={14} /> Bộ lọc
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', 'thread', 'post', 'user'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${type === t ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {t === 'all' ? 'Tất cả' : t === 'thread' ? 'Chủ đề' : t === 'post' ? 'Bài viết' : 'Người dùng'}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Tác giả (username)
            <input className="input mt-1" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="vd: thanhtinz" />
          </label>
          <label className="text-sm">Danh mục
            <select className="input mt-1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Tất cả —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Từ ngày
            <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">Đến ngày
            <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}

      {q.trim().length < 2 && <p className="text-ink-500">Nhập từ khóa (≥2 ký tự).</p>}
      {loading && <div className="p-6 text-center text-ink-500">Đang tìm…</div>}
      {empty && <div className="card p-8 text-center text-ink-500">Không tìm thấy kết quả nào.</div>}

      {r.threads?.length > 0 && (
        <Section title="Chủ đề" icon={MessageSquare}>
          {r.threads.map((t: any) => (
            <Link key={t.id} href={`/thread?slug=${t.slug}`} className="flex justify-between border-b border-ink-100 py-2 text-sm hover:text-brand-600 dark:border-ink-800">
              <span>{t.title}</span><span className="text-xs text-ink-400">{t.replyCount} trả lời · {t.viewCount} xem</span>
            </Link>
          ))}
        </Section>
      )}
      {r.users?.length > 0 && (
        <Section title="Người dùng" icon={User}>
          {r.users.map((u: any) => (
            <Link key={u.id} href={`/profile?u=${u.username}`} className="flex justify-between border-b border-ink-100 py-2 text-sm hover:text-brand-600 dark:border-ink-800">
              <span>{u.displayName || u.username} <span className="text-ink-400">@{u.username}</span></span><span className="text-xs text-ink-400">{u.role}</span>
            </Link>
          ))}
        </Section>
      )}
      {r.posts?.length > 0 && (
        <Section title="Bài viết" icon={MessageSquare}>
          {r.posts.map((p: any) => (
            <Link key={p.id} href={p.thread ? `/thread?slug=${p.thread.slug}#post-${p.id}` : '#'} className="block border-b border-ink-100 py-2 text-sm hover:text-brand-600 dark:border-ink-800">
              <div className="font-medium">{p.thread?.title || 'Bài viết'}</div>
              <div className="text-xs text-ink-400">{p.author?.displayName || p.author?.username || 'Ẩn danh'} · {p.likeCount} thích</div>
            </Link>
          ))}
        </Section>
      )}

      {!empty && data && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm disabled:opacity-40">
            <ChevronLeft size={14} /> Trước
          </button>
          <span className="text-sm text-ink-500">Trang {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!hasMore} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm disabled:opacity-40">
            Sau <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold"><Icon size={16} /> {title}</h2>
      {children}
    </section>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><SearchView /></Suspense>;
}
