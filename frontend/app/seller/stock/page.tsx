'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerStock() {
  const [products, setProducts] = useState<any[]>([]);
  const [pid, setPid] = useState('');
  const [stock, setStock] = useState<any>(null);
  const [lines, setLines] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get<any[]>('/marketplace/me/products').then((p) => { setProducts(p); if (p[0]) setPid(p[0].id); }).catch(() => {}); }, []);
  function loadStock(id: string) { if (id) api.get(`/marketplace/products/${id}/stock`).then(setStock).catch(() => {}); }
  useEffect(() => { loadStock(pid); /* eslint-disable-next-line */ }, [pid]);

  async function add() {
    try { const r = await api.post<any>(`/marketplace/products/${pid}/stock`, { lines: lines.split('\n') }); setMsg(`Đã thêm ${r.added} dòng`); setLines(''); } catch (e: any) { setMsg(e.message); }
    loadStock(pid);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Kho hàng (giao tự động)</h1>
      <p className="text-sm text-ink-500">Mỗi dòng = 1 tài khoản/key/link. Khi khách mua, hệ thống tự giao 1 dòng chưa bán.</p>
      <select className="input w-72" value={pid} onChange={(e) => setPid(e.target.value)}>
        {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      {products.length === 0 && <p className="text-ink-500">Bạn chưa có sản phẩm.</p>}

      {stock && (
        <>
          <div className="card p-4">
            <div className="mb-2 font-semibold">Tồn kho khả dụng: <span className="text-emerald-600">{stock.available}</span></div>
            <textarea className="input font-mono text-sm" rows={5} placeholder="user1|pass1&#10;KEY-XXXX-YYYY&#10;https://link-tai-ve" value={lines} onChange={(e) => setLines(e.target.value)} />
            <button onClick={add} className="btn-primary mt-2">Thêm vào kho</button>
            {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
          </div>
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {stock.items.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 text-sm">
                <code className={`truncate ${s.isSold ? 'text-ink-400 line-through' : ''}`}>{s.content}</code>
                {s.isSold ? <span className="chip bg-ink-200 text-ink-500">đã bán</span>
                  : <button onClick={() => api.del(`/marketplace/stock/${s.id}`).then(() => loadStock(pid))} className="text-xs text-red-600">Xóa</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
