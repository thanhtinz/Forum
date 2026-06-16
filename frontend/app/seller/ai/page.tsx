'use client';

import { useState } from 'react';
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

  async function run() {
    setBusy(true); setErr(''); setOut('');
    try { const r = await api.post<{ result: string }>('/marketplace/seller/ai', { task, input }); setOut(r.result); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const cur = TASKS.find((t) => t.id === task)!;

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
