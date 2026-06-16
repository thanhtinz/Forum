'use client';

import { useEffect, useState } from 'react';
import { Pin, Star, Store, Bot, Gem, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const DURS: [string, string][] = [['d1', '1 ngày'], ['d7', '7 ngày'], ['d30', '1 tháng']];

export default function SellerBoost() {
  const [d, setD] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [pid, setPid] = useState('');
  const [msg, setMsg] = useState('');

  function load() { api.get('/marketplace/seller/perks').then(setD).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); api.get<any[]>('/marketplace/me/products').then((p) => { setProducts(p); if (p[0]) setPid(p[0].id); }).catch(() => {}); }, []);

  const act = async (fn: () => Promise<any>) => { try { const r = await fn(); setMsg(`Đã mua (−${r.spent} gem)`); } catch (e: any) { setMsg(e.message); } load(); };
  if (!d) return <div className="p-10 text-center text-ink-500">{msg || 'Đang tải…'}</div>;
  const P = d.prices;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Dịch vụ quảng bá (trả bằng gem)</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Ghim & đề xuất sản phẩm */}
      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Pin size={16} /> Ghim / Đề xuất sản phẩm</h2>
        <select className="input mb-3 w-72" value={pid} onChange={(e) => setPid(e.target.value)}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {products.length === 0 && <p className="text-sm text-ink-500">Bạn chưa có sản phẩm.</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium">Ghim sản phẩm</div>
            <div className="flex gap-2">{DURS.map(([k, l]) => <button key={k} disabled={!pid} onClick={() => act(() => api.post(`/marketplace/seller/perks/product/${pid}`, { kind: 'pin', dur: k }))} className="btn-outline inline-flex flex-1 items-center justify-center gap-1 !py-1 text-xs disabled:opacity-50">{l} · {P.pinProduct[k]}<Gem size={12} /></button>)}</div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Đề xuất sản phẩm</div>
            <div className="flex gap-2">{DURS.map(([k, l]) => <button key={k} disabled={!pid} onClick={() => act(() => api.post(`/marketplace/seller/perks/product/${pid}`, { kind: 'feature', dur: k }))} className="btn-outline inline-flex flex-1 items-center justify-center gap-1 !py-1 text-xs disabled:opacity-50">{l} · {P.featureProduct[k]}<Gem size={12} /></button>)}</div>
          </div>
        </div>
      </section>

      {/* Đề xuất gian hàng */}
      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Store size={16} /> Đề xuất gian hàng</h2>
        {d.storeFeaturedUntil && new Date(d.storeFeaturedUntil) > new Date() && <p className="mb-2 text-xs text-emerald-600">Đang được đề xuất đến {new Date(d.storeFeaturedUntil).toLocaleDateString('vi')}</p>}
        <div className="flex gap-2">{DURS.map(([k, l]) => <button key={k} onClick={() => act(() => api.post('/marketplace/seller/perks/store', { dur: k }))} className="btn-outline inline-flex flex-1 items-center justify-center gap-1 !py-1 text-xs">{l} · {P.featureStore[k]}<Gem size={12} /></button>)}</div>
      </section>

      {/* Gói AI shop */}
      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Bot size={16} /> Gói Công cụ AI</h2>
        <p className="mb-2 inline-flex items-center gap-1 text-xs text-ink-500">
          {d.aiForever ? <><CheckCircle2 size={12} /> Đã mở vĩnh viễn</> : d.aiUntil && new Date(d.aiUntil) > new Date() ? `Còn hạn đến ${new Date(d.aiUntil).toLocaleDateString('vi')}` : 'Chưa kích hoạt'}
        </p>
        <div className="flex gap-2">
          <button onClick={() => act(() => api.post('/marketplace/seller/perks/ai', { plan: 'month' }))} className="btn-outline inline-flex flex-1 items-center justify-center gap-1 !py-1 text-xs">1 tháng · {P.aiShop.month}<Gem size={12} /></button>
          <button onClick={() => act(() => api.post('/marketplace/seller/perks/ai', { plan: 'forever' }))} className="btn-primary inline-flex flex-1 items-center justify-center gap-1 !py-1 text-xs">Vĩnh viễn · {P.aiShop.forever}<Gem size={12} /></button>
        </div>
      </section>
    </div>
  );
}
