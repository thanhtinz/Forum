'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerAnalytics() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/marketplace/seller/analytics').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="card p-8 text-center text-ink-500">{err}</div>;
  if (!d) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Thống kê nâng cao</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Lượt xem', d.totalViews], ['Lượt bán', d.totalSales], ['Tỷ lệ chuyển đổi', d.conversion + '%'], ['Tỷ lệ hoàn tiền', d.refundRate + '%']].map(([l, v]) => (
          <div key={l as string} className="card p-4 text-center"><div className="text-2xl font-bold">{v as any}</div><div className="text-xs text-ink-500">{l}</div></div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Doanh thu theo danh mục</h2>
        {d.byCategory.length === 0 ? <p className="text-sm text-ink-500">Chưa có dữ liệu.</p> : d.byCategory.map((c: any) => (
          <div key={c.name} className="flex justify-between border-b border-ink-100 py-1 text-sm dark:border-ink-800"><span>{c.name}</span><span className="font-medium">{c.revenue} gem</span></div>
        ))}
      </div>

      <div className="card overflow-x-auto p-5">
        <h2 className="mb-2 font-semibold">Theo sản phẩm</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-500"><tr><th className="p-2">Sản phẩm</th><th className="p-2">Xem</th><th className="p-2">Bán</th><th className="p-2">Chuyển đổi</th><th className="p-2">Doanh thu</th></tr></thead>
          <tbody>
            {d.products.map((p: any) => (
              <tr key={p.title} className="border-t border-ink-100 dark:border-ink-800"><td className="p-2">{p.title}</td><td className="p-2">{p.views}</td><td className="p-2">{p.sales}</td><td className="p-2">{p.conversion}%</td><td className="p-2">{p.revenue}</td></tr>
            ))}
            {d.products.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-ink-500">Chưa có sản phẩm.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
