'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, User } from 'lucide-react';
import { api } from '@/lib/api';

function SearchView() {
  const q = useSearchParams().get('q') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setData(null); return; }
    setLoading(true);
    api.get<any>(`/search?q=${encodeURIComponent(q)}`).then((d) => setData(d.results || {})).catch(() => setData({})).finally(() => setLoading(false));
  }, [q]);

  const r = data || {};
  const empty = data && !r.threads?.length && !r.posts?.length && !r.users?.length;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Kết quả cho “{q}”</h1>
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
            <div key={p.id} className="border-b border-ink-100 py-2 text-sm dark:border-ink-800">{p.author?.username || 'Ẩn danh'} · {p.likeCount} thích</div>
          ))}
        </Section>
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
