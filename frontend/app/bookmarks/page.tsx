'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BookmarkCheck, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface BM {
  id: string; note?: string | null;
  thread: { id: string; title: string; slug: string; replyCount: number; lastPostAt: string; category?: { name: string; color?: string } };
}

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<BM[]>([]);
  const [state, setState] = useState<'load' | 'ok'>('load');

  function load() { api.get<BM[]>('/forum/bookmarks').then((s) => { setItems(s); setState('ok'); }).catch(() => setState('ok')); }
  useEffect(() => { if (loading) return; if (!user) { setState('ok'); return; } load(); }, [user, loading]);

  async function remove(threadId: string) {
    try { await api.post(`/forum/threads/${threadId}/bookmark`, {}); setItems((p) => p.filter((b) => b.thread.id !== threadId)); } catch {}
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem chủ đề đã lưu.</div>;
  if (state === 'load') return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <BookmarkCheck /> <h1 className="text-2xl font-bold">Chủ đề đã lưu</h1>
      </header>
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="card flex items-center justify-between gap-3 p-4">
            <Link href={`/thread?slug=${b.thread.slug}`} className="min-w-0 flex-1 hover:underline">
              <div className="truncate font-medium">{b.thread.title}</div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-500">
                {b.thread.category && <span className="text-brand-600">{b.thread.category.name}</span>}
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {b.thread.replyCount}</span>
                <span>{(() => { try { return formatDistanceToNow(new Date(b.thread.lastPostAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
              </div>
            </Link>
            <button onClick={() => remove(b.thread.id)} className="btn-outline !py-1 text-xs">Bỏ lưu</button>
          </div>
        ))}
        {items.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có chủ đề nào được lưu. Mở một chủ đề và bấm "Lưu".</div>}
      </div>
    </div>
  );
}
