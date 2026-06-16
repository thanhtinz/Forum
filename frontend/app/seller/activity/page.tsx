'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerActivity() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/marketplace/seller/activity').then(setData).catch(() => {}); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nhật ký hoạt động</h1>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {data?.data?.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between p-3 text-sm">
            <span><code className="text-brand-600">{l.action}</code> · {l.detail}</span>
            <span className="text-xs text-ink-400">{new Date(l.createdAt).toLocaleString('vi')}</span>
          </div>
        ))}
        {data && data.data.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có hoạt động.</div>}
      </div>
    </div>
  );
}
