'use client';

import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { api } from '@/lib/api';

const TASKS = [
  { id: 'description', label: 'Viết mô tả sản phẩm', ph: 'Tên + tính năng chính của sản phẩm…' },
  { id: 'seo', label: 'Tạo tiêu đề SEO', ph: 'Tên sản phẩm + từ khóa…' },
  { id: 'reply', label: 'Trả lời khách hàng', ph: 'Câu hỏi của khách…' },
  { id: 'analyze', label: 'Phân tích doanh thu', ph: 'Dán số liệu doanh thu…' },
];

export default function SellerAi() {
  const [task, setTask] = useState('description');
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [perks, setPerks] = useState<any>(null);

  useEffect(() => { api.get<any>('/marketplace/seller/perks').then(setPerks).catch(() => setPerks({})); }, []);
  const aiActive = !!perks && (perks.aiForever || (perks.aiUntil && new Date(perks.aiUntil).getTime() > Date.now()));

  async function buy(plan: 'month' | 'forever') {
    setErr('');
    try { await api.post('/marketplace/seller/perks/ai', { plan }); const p = await api.get<any>('/marketplace/seller/perks'); setPerks(p); }
    catch (e: any) { setErr(e.message); }
  }

  async function run() {
    setBusy(true); setErr(''); setOut('');
    try { const r = await api.post<{ result: string }>('/marketplace/seller/ai', { task, input }); setOut(r.result); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const cur = TASKS.find((t) => t.id === task)!;

  if (perks === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  // Chưa mua gói AI -> hiện màn hình giới thiệu + mua
  if (!aiActive) {
    const price = perks?.prices?.aiShop || {};
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Bot /> Công cụ AI</h1>
        <div className="card space-y-3 p-6 text-center">
          <div className="text-4xl">🤖</div>
          <p className="font-semibold">Trợ lý AI cho gian hàng</p>
          <p className="text-sm text-ink-500">Viết mô tả sản phẩm, tiêu đề SEO, trả lời khách & phân tích doanh thu tự động. Cần mua gói AI shop để sử dụng.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={() => buy('month')} className="btn-outline">Gói tháng{price.month != null ? ` · ${price.month} gem` : ''}</button>
            <button onClick={() => buy('forever')} className="btn-primary">Vĩnh viễn{price.forever != null ? ` · ${price.forever} gem` : ''}</button>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Bot /> Công cụ AI</h1>
      <div className="flex flex-wrap gap-2">
        {TASKS.map((t) => (
          <button key={t.id} onClick={() => { setTask(t.id); setOut(''); }} className={`rounded-lg px-3 py-1.5 text-sm ${task === t.id ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>
      <div className="card space-y-2 p-4">
        <textarea className="input h-32" placeholder={cur.ph} value={input} onChange={(e) => setInput(e.target.value)} />
        <button onClick={run} disabled={busy} className="btn-primary">{busy ? 'AI đang xử lý…' : 'Tạo bằng AI'}</button>
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      {out && <div className="card whitespace-pre-wrap p-4 text-sm">{out}</div>}
    </div>
  );
}
