'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Setting { key: string; label: string; type: string; value: any; isSecret?: boolean; options?: { label: string; value: string }[] }

export default function AdminPayments() {
  const [stats, setStats] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [cfgMsg, setCfgMsg] = useState('');

  function loadCfg() {
    api.get<{ settings: Setting[] }>('/admin/config/payments').then((g) => {
      setSettings(g.settings || []);
      const v: Record<string, any> = {}; (g.settings || []).forEach((s) => { v[s.key] = s.value; });
      setVals(v);
    }).catch(() => {});
  }
  function load() { api.get(`/payments/admin/topups${status ? `?status=${status}` : ''}`).then(setData).catch(() => {}); }
  useEffect(() => {
    api.get('/payments/admin/stats').then(setStats).catch(() => {});
    loadCfg();
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  async function saveCfg() {
    setCfgMsg('');
    try {
      for (const s of settings) {
        const v = vals[s.key];
        if (s.isSecret && v === '••••••••') continue; // không đổi secret nếu còn mask
        if (v !== s.value) await api.patch(`/admin/config/setting/${s.key}`, { value: v });
      }
      setCfgMsg('Đã lưu cấu hình ✓'); loadCfg(); setTimeout(() => setCfgMsg(''), 2500);
    } catch (e: any) { setCfgMsg(e.message); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nạp tiền</h1>

      {/* Cấu hình cổng nạp & ngưỡng rút (gộp từ Cấu hình) */}
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Cấu hình thanh toán & rút tiền</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {settings.map((s) => (
            <label key={s.key} className="text-sm">
              <span className="mb-1 block text-ink-500">{s.label}</span>
              {s.type === 'boolean' ? (
                <input type="checkbox" checked={!!vals[s.key]} onChange={(e) => setVals({ ...vals, [s.key]: e.target.checked })} />
              ) : s.type === 'select' ? (
                <select className="input" value={vals[s.key] ?? ''} onChange={(e) => setVals({ ...vals, [s.key]: e.target.value })}>
                  {(s.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : s.type === 'number' ? (
                <input type="number" className="input" value={vals[s.key] ?? 0} onChange={(e) => setVals({ ...vals, [s.key]: Number(e.target.value) })} />
              ) : (
                <input type="text" className="input" value={vals[s.key] ?? ''} onChange={(e) => setVals({ ...vals, [s.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveCfg} className="btn-primary !py-1.5 text-sm">Lưu cấu hình</button>
          {cfgMsg && <span className="text-sm text-emerald-600">{cfgMsg}</span>}
        </div>
      </div>

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
