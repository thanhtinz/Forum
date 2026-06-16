'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Users, ShoppingBag, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

function StoreView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');

  const [products, setProducts] = useState<any[]>([]);
  const [showTicket, setShowTicket] = useState(false);
  const [ticket, setTicket] = useState({ subject: '', body: '' });

  function load() {
    api.get<any>(`/marketplace/storefronts/${slug}`).then((st) => {
      setS(st);
      api.get<any[]>(`/marketplace/storefronts/${slug}/products`).then(setProducts).catch(() => {});
    }).catch((e) => setErr(e.message));
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug]);

  async function sendTicket() {
    if (!user) { setErr('Đăng nhập để gửi yêu cầu'); return; }
    try { await api.post(`/marketplace/storefronts/${s.id}/tickets`, ticket); setShowTicket(false); setTicket({ subject: '', body: '' }); alert('Đã gửi yêu cầu hỗ trợ'); } catch (e: any) { setErr(e.message); }
  }

  async function toggleFollow() {
    if (!user) { setErr('Đăng nhập để theo dõi'); return; }
    try { await (s.isFollowing ? api.del(`/marketplace/storefronts/${s.id}/follow`) : api.post(`/marketplace/storefronts/${s.id}/follow`)); } catch {}
    load();
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!s) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="space-y-4">
      {s.bannerUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.bannerUrl} alt="" className="h-40 w-full rounded-2xl object-cover" />}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-ink-800">
          {s.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.logoUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={28} />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1 text-xl font-bold">{s.name}{s.isVerified && <BadgeCheck size={18} className="text-brand-500" />}</h1>
          {s.tagline && <p className="text-sm text-ink-500">{s.tagline}</p>}
          <div className="mt-1 flex gap-4 text-xs text-ink-500">
            <span className="flex items-center gap-1"><Users size={13} /> {s.followerCount} theo dõi</span>
            <span className="flex items-center gap-1"><ShoppingBag size={13} /> {s.totalSales} đã bán</span>
            <span className="flex items-center gap-1"><Star size={13} /> {s.ratingAvg?.toFixed?.(1) ?? 0} ({s.ratingCount})</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleFollow} className={s.isFollowing ? 'btn-outline' : 'btn-primary'}>{s.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}</button>
          <button onClick={() => setShowTicket((v) => !v)} className="btn-outline">Liên hệ</button>
        </div>
      </div>

      {showTicket && (
        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Gửi yêu cầu hỗ trợ</h2>
          <input className="input" placeholder="Tiêu đề" value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Nội dung" value={ticket.body} onChange={(e) => setTicket({ ...ticket, body: e.target.value })} />
          <button onClick={sendTicket} className="btn-primary">Gửi</button>
        </div>
      )}

      {products.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Sản phẩm ({products.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
                {p.thumbnailUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.thumbnailUrl} alt={p.title} className="mb-2 h-24 w-full rounded object-cover" />}
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-brand-600">{p.isFree ? 'Miễn phí' : `${p.gemPrice} gem`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.description && <div className="card p-5"><h2 className="mb-2 font-semibold">Giới thiệu</h2><p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{s.description}</p></div>}
      {s.policyRefund && <div className="card p-5"><h2 className="mb-2 font-semibold">Chính sách</h2><p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{s.policyRefund}</p></div>}
      <Link href="/marketplace" className="text-sm text-ink-500 hover:text-brand-600">← Tất cả gian hàng</Link>
    </div>
  );
}

export default function StorePage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><StoreView /></Suspense>;
}
