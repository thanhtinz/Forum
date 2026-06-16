'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const TIER_COLOR: Record<string, string> = {
  BRONZE: 'bg-amber-700', SILVER: 'bg-slate-400', GOLD: 'bg-yellow-500', PLATINUM: 'bg-cyan-500', DIAMOND: 'bg-violet-500',
};

export default function SellerDashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/marketplace/seller/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="card p-8 text-center text-ink-500">{err} — hãy tạo gian hàng trước.</div>;
  if (!d) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const max = Math.max(1, ...d.chart.map((c: any) => c.revenue));
  const cards = [
    ['Tổng doanh thu', d.totalRevenue], ['Hôm nay', d.revenueToday], ['Tuần', d.revenueWeek], ['Tháng', d.revenueMonth],
    ['Số dư khả dụng', d.available], ['Đang giam', d.pending], ['Đơn mới (hôm nay)', d.ordersNew], ['Đã hoàn thành', d.ordersCompleted],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <span className={`chip text-white ${TIER_COLOR[d.tier] || 'bg-ink-500'}`}>{d.tier}{d.verified ? ' · ✓ Verified' : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l as string} className="card p-4"><div className="text-2xl font-bold">{(v as number).toLocaleString()}</div><div className="text-xs text-ink-500">{l}</div></div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Doanh thu 7 ngày (gem)</h2>
        <div className="flex h-40 items-end gap-2">
          {d.chart.map((c: any) => (
            <div key={c.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-brand-500" style={{ height: `${(c.revenue / max) * 100}%`, minHeight: c.revenue ? 4 : 0 }} title={`${c.revenue}`} />
              <span className="text-[10px] text-ink-400">{c.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Sản phẩm bán chạy</h2>
        <div className="space-y-1 text-sm">
          {d.bestSellers.map((p: any) => (
            <div key={p.id} className="flex justify-between border-b border-ink-100 py-1 dark:border-ink-800">
              <span>{p.title}</span><span className="text-ink-500">{p.salesCount} bán · {p.viewCount} xem</span>
            </div>
          ))}
          {d.bestSellers.length === 0 && <p className="text-ink-500">Chưa có sản phẩm.</p>}
        </div>
      </div>
    </div>
  );
}
