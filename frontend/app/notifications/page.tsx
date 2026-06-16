'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<any>(null);
  function load() { api.get('/notifications').then(setData).catch(() => {}); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem thông báo.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Thông báo {data?.meta?.unreadCount ? <span className="chip ml-2 bg-red-100 text-red-600">{data.meta.unreadCount} mới</span> : null}</h1>
        <button onClick={() => api.post('/notifications/read-all').then(load)} className="btn-outline text-xs">Đánh dấu đã đọc</button>
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {data?.data?.map((n: any) => (
          <button key={n.id} onClick={() => api.post(`/notifications/${n.id}/read`).then(load)}
            className={`block w-full p-3 text-left text-sm ${n.isRead ? '' : 'bg-brand-50/50 dark:bg-ink-800/40'}`}>
            <div className="font-medium">{n.title}</div>
            {n.body && <div className="text-ink-500">{n.body}</div>}
            <div className="text-xs text-ink-400">{new Date(n.createdAt).toLocaleString('vi')}</div>
          </button>
        ))}
        {data && data.data.length === 0 && <div className="p-8 text-center text-ink-500">Chưa có thông báo.</div>}
      </div>
    </div>
  );
}
