'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminPayments() {
  const [stats, setStats] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');

  function load() { api.get(`/payments/admin/topups${status ? `?status=${status}` : ''}`).then(setData).catch(() => {}); }
  useEffect(() => { api.get('/payments/admin/stats').then(setStats).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nạp tiền</h1>
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{stats.revenueVnd.toLocaleString()}đ</div><div className="text-xs text-ink-500">Doanh thu (đã xác nhận)</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-fuchsia-600">{stats.gemAwarded.toLocaleString()}</div><div className="text-xs text-ink-500">Gem đã cộng</div></div>
          <div className="card p-4 text-center text-xs">{stats.byStatus?.map((s: any) => <div key={s.status}>{s.status}: {s.count}</div>)}</div>
        </div>
      )}
      <div className="flex gap-2">
        {['', 'pending', 'completed'].map((s) => <button key={s || 'all'} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{s || 'Tất cả'}</button>)}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-500"><tr><th className="p-2">User</th><th className="p-2">Provider</th><th className="p-2">Số tiền</th><th className="p-2">Gem</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày</th></tr></thead>
          <tbody>
            {data?.data?.map((t: any) => (
              <tr key={t.id} className="border-t border-ink-100 dark:border-ink-800">
                <td className="p-2">{t.username || t.userId.slice(0, 8)}</td>
                <td className="p-2">{t.provider}</td>
                <td className="p-2">{t.amountVnd ? t.amountVnd.toLocaleString() + 'đ' : t.amountUsd ? '$' + t.amountUsd : '—'}</td>
                <td className="p-2">{t.gemAwarded}</td>
                <td className="p-2"><span className="chip bg-ink-200 text-ink-600">{t.status}</span></td>
                <td className="p-2 text-xs text-ink-400">{new Date(t.createdAt).toLocaleDateString('vi')}</td>
              </tr>
            ))}
            {data && data.data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-500">Chưa có giao dịch nạp.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
