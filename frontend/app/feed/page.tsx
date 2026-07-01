'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

interface FeedAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
}
interface FeedItem {
  type: 'thread' | 'profile_post';
  id: string;
  createdAt: string;
  author: FeedAuthor;
  title?: string;
  content?: string;
  link: string;
}

export default function FeedPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFetching(false); return; }
    api.get<{ data: FeedItem[] }>('/social/feed?page=1&limit=30')
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, loading]);

  if (loading || fetching) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-bold">Bảng tin</h1>
        <p className="mt-2 text-ink-500">Đăng nhập để xem hoạt động từ những người bạn theo dõi.</p>
        <Link href="/login" className="btn-primary mt-4 inline-block">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bảng tin</h1>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={40} className="mx-auto text-ink-300" />
          <p className="mt-3 font-medium">Chưa có hoạt động nào</p>
          <p className="mt-1 text-sm text-ink-500">Hãy theo dõi thành viên khác để xem chủ đề và bài viết của họ tại đây.</p>
          <Link href="/members" className="btn-primary mt-4 inline-block">Khám phá thành viên</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={`${it.type}-${it.id}`} className="card flex items-start gap-3 p-4">
              <Avatar user={it.author} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <a href={`/profile?u=${it.author.username}`} className="font-semibold hover:underline">{it.author.displayName || it.author.username}</a>
                  <span className="text-ink-500">
                    {it.type === 'thread' ? 'đã tạo chủ đề mới' : 'đã đăng lên tường nhà'}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-xs text-ink-400">{new Date(it.createdAt).toLocaleString('vi')}</span>
                </div>
                <Link href={it.link} className="mt-1 flex items-start gap-2 text-sm hover:text-brand-600">
                  {it.type === 'thread'
                    ? <FileText size={15} className="mt-0.5 shrink-0 text-brand-500" />
                    : <MessageSquare size={15} className="mt-0.5 shrink-0 text-emerald-500" />}
                  <span className="break-words">{it.type === 'thread' ? it.title : it.content}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
