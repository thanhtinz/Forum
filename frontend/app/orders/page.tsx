'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { if (!loading && user) api.get<any[]>('/marketplace/me/purchases').then(setOrders).catch(() => {}); }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem đơn hàng.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex items-center gap-3">
              {o.thumbnailUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={o.thumbnailUrl} alt={o.title} className="h-14 w-14 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{o.title}</div>
                <div className="text-xs text-ink-500">
                  {o.shopSlug ? <Link href={`/store?slug=${o.shopSlug}`} className="text-brand-600">{o.shop}</Link> : o.shop} · {o.gemSpent} gem · {new Date(o.createdAt).toLocaleDateString('vi')}
                </div>
              </div>
              <span className="chip bg-ink-200 text-ink-600">{o.status}</span>
            </div>
            {(o.deliveredContent || o.downloadUrl) && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-ink-900">
                <div className="mb-1 font-medium text-emerald-700">Đã giao:</div>
                {o.deliveredContent && <pre className="whitespace-pre-wrap break-all font-mono text-xs">{o.deliveredContent}</pre>}
                {o.downloadUrl && <a href={o.downloadUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">Tải xuống</a>}
              </div>
            )}
            {!o.deliveredContent && !o.downloadUrl && <p className="mt-2 text-xs text-amber-600">Đang chờ người bán giao hàng…</p>}
          </div>
        ))}
        {orders.length === 0 && <div className="card p-10 text-center text-ink-500">Bạn chưa mua sản phẩm nào.</div>}
      </div>
    </div>
  );
}
