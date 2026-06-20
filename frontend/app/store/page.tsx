'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Users, ShoppingBag, Star, ShoppingCart, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Buyer { id: string; buyer: string; product: string; at: string }
interface Cat { id: string; name: string; slug: string }
interface Prod { id: string; title: string; slug: string; gemPrice: number; isFree: boolean; thumbnailUrl?: string | null; salesCount: number; ratingAvg: number; categoryId?: string | null }

function StoreView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState<Prod[]>([]);
  const [cat, setCat] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [ticket, setTicket] = useState({ subject: '', body: '' });

  function load() {
    api.get<any>(`/marketplace/storefronts/${slug}`).then((st) => {
      setS(st);
      api.get<Prod[]>(`/marketplace/storefronts/${slug}/products`).then(setProducts).catch(() => {});
    }).catch((e) => setErr(e.message));
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug]);

  const shown = useMemo(() => (cat ? products.filter((p) => p.categoryId === cat) : products), [products, cat]);

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

  const buyers: Buyer[] = s.recentBuyers || [];
  const cats: Cat[] = s.categories || [];

  return (
    <div className="space-y-4">
      {/* Card thông tin shop */}
      <div className="card overflow-hidden p-0">
        {s.bannerUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={s.bannerUrl} alt="" className="h-32 w-full object-cover sm:h-44" />
          : <div className="h-24 w-full bg-gradient-to-r from-indigo-600 to-violet-600 sm:h-32" />}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="-mt-12 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-indigo-50 text-indigo-600 shadow dark:border-ink-900 dark:bg-ink-800">
            {s.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={s.logoUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={30} />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1 text-xl font-bold">{s.name}{s.isVerified && <BadgeCheck size={18} className="text-brand-500" />}</h1>
            {s.tagline && <p className="text-sm text-ink-500">{s.tagline}</p>}
            <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Users size={13} /> {s.followerCount} theo dõi</span>
              <span className="flex items-center gap-1"><ShoppingBag size={13} /> {s.totalSales} đã bán</span>
              <span className="flex items-center gap-1"><Star size={13} className="text-amber-400" /> {s.ratingAvg?.toFixed?.(1) ?? 0} ({s.ratingCount})</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleFollow} className={s.isFollowing ? 'btn-outline' : 'btn-primary'}>{s.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}</button>
            <button onClick={() => setShowTicket((v) => !v)} className="btn-outline">Liên hệ</button>
          </div>
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

      {/* Người đã mua gần đây — chạy ngang */}
      {buyers.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 whitespace-nowrap py-2 text-xs text-ink-500">
            <span className="shrink-0 bg-emerald-500 px-2.5 py-1 font-semibold text-white">🔥 Mua gần đây</span>
            <div className="marquee flex gap-6 pr-6">
              {[...buyers, ...buyers].map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1"><ShoppingCart size={12} className="text-emerald-500" /> <b className="text-ink-700 dark:text-ink-200">{b.buyer}</b> đã mua <span className="text-brand-600">{b.product}</span></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc theo danh mục shop bán */}
      {cats.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button onClick={() => setCat('')} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${!cat ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>Tất cả</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${cat === c.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>{c.name}</button>
          ))}
        </div>
      )}

      {/* Sản phẩm */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <Link key={p.id} href={`/product?slug=${p.slug}`} className="card group overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="aspect-[4/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
                {p.thumbnailUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.thumbnailUrl} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center text-ink-300"><ShoppingBag size={32} /></div>}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand-600">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-600">{p.isFree ? 'Miễn phí' : <span className="inline-flex items-center gap-1"><Gem size={13} /> {p.gemPrice}</span>}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-400">
                    {p.ratingAvg > 0 && <span className="inline-flex items-center gap-0.5"><Star size={12} className="fill-amber-400 text-amber-400" /> {p.ratingAvg.toFixed(1)}</span>}
                    <span>{p.salesCount} bán</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <div className="card p-8 text-center text-ink-500">Chưa có sản phẩm{cat ? ' trong danh mục này' : ''}.</div>}

      {s.description && <div className="card p-5"><h2 className="mb-2 font-semibold">Giới thiệu</h2><p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{s.description}</p></div>}
      {s.policyRefund && <div className="card p-5"><h2 className="mb-2 font-semibold">Chính sách</h2><p className="whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{s.policyRefund}</p></div>}
      <Link href="/marketplace/stores" className="text-sm text-ink-500 hover:text-brand-600">← Tất cả gian hàng</Link>
    </div>
  );
}

export default function StorePage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><StoreView /></Suspense>;
}
