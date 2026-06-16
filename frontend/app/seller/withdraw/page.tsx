'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerWithdraw() {
  const [methods, setMethods] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [mForm, setMForm] = useState({ type: 'BANK', label: '', detail: '' });
  const [amount, setAmount] = useState(100);
  const [methodId, setMethodId] = useState('');
  const [msg, setMsg] = useState('');
  const [feePercent, setFeePercent] = useState(0);

  function load() {
    api.get<any[]>('/marketplace/seller/payout-methods').then((m) => { setMethods(m); if (m[0]) setMethodId(m[0].id); }).catch(() => {});
    api.get<any[]>('/marketplace/seller/withdrawals').then(setHistory).catch(() => {});
    api.get<{ feePercent: number }>('/marketplace/withdraw-fee').then((r) => setFeePercent(r.feePercent)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const feeAmount = Math.round((amount * feePercent) / 100);
  const netAmount = amount - feeAmount;

  async function addMethod() {
    if (!mForm.label || !mForm.detail) return;
    try { await api.post('/marketplace/seller/payout-methods', mForm); setMForm({ type: 'BANK', label: '', detail: '' }); } catch (e: any) { setMsg(e.message); }
    load();
  }
  async function request() {
    setMsg('');
    try { await api.post('/marketplace/seller/withdrawals', { amount: Number(amount), methodId }); setMsg('Đã gửi yêu cầu rút tiền'); } catch (e: any) { setMsg(e.message); }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Rút tiền</h1>

      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Phương thức nhận tiền</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select className="input" value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })}>
            <option value="BANK">Ngân hàng</option><option value="PAYPAL">PayPal</option><option value="MOMO">Momo</option>
          </select>
          <input className="input" placeholder="Nhãn (VD: Vietcombank)" value={mForm.label} onChange={(e) => setMForm({ ...mForm, label: e.target.value })} />
          <input className="input" placeholder="Số TK / email" value={mForm.detail} onChange={(e) => setMForm({ ...mForm, detail: e.target.value })} />
          <button onClick={addMethod} className="btn-outline">Thêm</button>
        </div>
        <div className="space-y-1 text-sm">
          {methods.map((m) => (
            <div key={m.id} className="flex justify-between border-b border-ink-100 py-1 dark:border-ink-800">
              <span>{m.type} · {m.label} · {m.detail}</span>
              <button onClick={() => api.del(`/marketplace/seller/payout-methods/${m.id}`).then(load)} className="text-xs text-red-600">Xóa</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Yêu cầu rút</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input type="number" className="input w-32" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Số gem" />
          <select className="input w-48" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button onClick={request} disabled={!methodId} className="btn-primary disabled:opacity-50">Yêu cầu rút</button>
        </div>
        <p className="text-xs text-ink-500">
          Phí rút: {feePercent}% = {feeAmount.toLocaleString()} 💎 · Thực nhận: <b className="text-emerald-600">{netAmount.toLocaleString()} 💎</b>
        </p>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </div>

      <div className="card p-4">
        <h2 className="mb-2 font-semibold">Lịch sử rút tiền</h2>
        <div className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
          {history.map((w) => (
            <div key={w.id} className="flex justify-between py-2">
              <span>{w.amount} gem{w.feeAmount ? ` (−${w.feeAmount} phí, nhận ${w.netAmount})` : ''} · {w.methodLabel}</span>
              <span className="chip bg-ink-200 text-ink-600">{w.status}</span>
            </div>
          ))}
          {history.length === 0 && <p className="py-3 text-ink-500">Chưa có yêu cầu rút.</p>}
        </div>
      </div>
    </div>
  );
}
