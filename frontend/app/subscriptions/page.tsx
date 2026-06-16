'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BellRing, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Sub {
  id: string;
  thread: { id: string; title: string; slug: string; replyCount: number; lastPostAt: string; category?: { name: string; color?: string } };
}

export default function SubscriptionsPage() {
  const { user, loading } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [state, setState] = useState<'load' | 'ok'>('load');

  useEffect(() => {
    if (loading) return;
    if (!user) { setState('ok'); return; }
    api.get<Sub[]>('/forum/subscriptions').then((s) => { setSubs(s); setState('ok'); }).catch(() => setState('ok'));
  }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem chủ đề đang theo dõi.</div>;
  if (state === 'load') return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-card">
        <BellRing /> <h1 className="text-2xl font-bold">Chủ đề đang theo dõi</h1>
      </header>
      <div className="space-y-2">
        {subs.map((s) => (
          <Link key={s.id} href={`/thread?slug=${s.thread.slug}`} className="card flex items-center justify-between p-4 hover:shadow-lg">
            <div className="min-w-0">
              <div className="truncate font-medium">{s.thread.title}</div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-500">
                {s.thread.category && <span className="text-brand-600">{s.thread.category.name}</span>}
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {s.thread.replyCount}</span>
                <span>{(() => { try { return formatDistanceToNow(new Date(s.thread.lastPostAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
              </div>
            </div>
          </Link>
        ))}
        {subs.length === 0 && <div className="card p-6 text-center text-ink-500">Bạn chưa theo dõi chủ đề nào. Mở một chủ đề và bấm "Theo dõi".</div>}
      </div>
    </div>
  );
}
