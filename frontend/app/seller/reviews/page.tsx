'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';

export default function SellerReviews() {
  const [list, setList] = useState<any[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  function load() { api.get<any[]>('/marketplace/seller/reviews').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function send(id: string) { await api.post(`/marketplace/reviews/${id}/reply`, { reply: reply[id] }).catch(() => {}); load(); }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đánh giá</h1>
      <div className="space-y-3">
        {list.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="flex text-amber-500">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />)}</span>
              <span className="text-sm font-medium">{r.product?.title}</span>
            </div>
            <p className="mt-1 text-sm">{r.content}</p>
            {r.sellerReply ? (
              <p className="mt-2 rounded-lg bg-ink-50 p-2 text-sm dark:bg-ink-900"><b>Phản hồi:</b> {r.sellerReply}</p>
            ) : (
              <div className="mt-2 flex gap-2">
                <input className="input" placeholder="Trả lời…" value={reply[r.id] || ''} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} />
                <button onClick={() => send(r.id)} className="btn-outline text-xs">Gửi</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có đánh giá.</div>}
      </div>
    </div>
  );
}
