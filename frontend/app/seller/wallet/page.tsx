'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerWallet() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.get('/marketplace/seller/wallet').then(setD).catch(() => {}); }, []);
  if (!d) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Ví & Tài chính</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-5 text-center"><div className="text-3xl font-bold text-emerald-600">{d.available.toLocaleString()}</div><div className="text-xs text-ink-500">Số dư khả dụng (gem)</div></div>
        <div className="card p-5 text-center"><div className="text-3xl font-bold text-amber-600">{d.pending.toLocaleString()}</div><div className="text-xs text-ink-500">Chờ xử lý (đang giam)</div></div>
      </div>
      <div className="card p-4">
        <h2 className="mb-2 font-semibold">Lịch sử giao dịch</h2>
        <div className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
          {d.transactions.map((t: any) => (
            <div key={t.id} className="flex justify-between py-2">
              <span>{t.note || t.type} <span className="text-ink-400">· {new Date(t.createdAt).toLocaleDateString('vi')}</span></span>
              <span className={t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>{t.amount >= 0 ? '+' : ''}{t.amount}</span>
            </div>
          ))}
          {d.transactions.length === 0 && <p className="py-3 text-ink-500">Chưa có giao dịch.</p>}
        </div>
      </div>
    </div>
  );
}
