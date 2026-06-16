'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SellerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliver, setDeliver] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'undelivered'>('all');
  const [msg, setMsg] = useState('');

  function load() { api.get<any[]>('/marketplace/seller/orders').then(setOrders).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function send(id: string) {
    try { await api.post(`/marketplace/orders/${id}/deliver`, { content: deliver[id] }); setMsg('Đã giao hàng'); } catch (e: any) { setMsg(e.message); }
    load();
  }

  const list = filter === 'undelivered' ? orders.filter((o) => !o.delivered) : orders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Đơn hàng</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Tất cả</button>
          <button onClick={() => setFilter('undelivered')} className={filter === 'undelivered' ? 'btn-primary !py-1 text-xs' : 'btn-outline !py-1 text-xs'}>Chưa giao</button>
        </div>
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <div className="space-y-2">
        {list.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex items-center justify-between text-sm">
              <div><b>{o.product}</b> <span className="text-ink-400">· {o.buyer} · {o.gemSpent} gem · {o.escrowStatus}</span></div>
              <span className={`chip ${o.delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{o.delivered ? 'Đã giao' : 'Chưa giao'}</span>
            </div>
            {!o.delivered && (
              <div className="mt-2 flex gap-2">
                <input className="input" placeholder="Nội dung giao (tài khoản/key/link)…" value={deliver[o.id] || ''} onChange={(e) => setDeliver({ ...deliver, [o.id]: e.target.value })} />
                <button onClick={() => send(o.id)} className="btn-primary text-xs">Giao thủ công</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="card p-6 text-center text-ink-500">Không có đơn.</div>}
      </div>
    </div>
  );
}
