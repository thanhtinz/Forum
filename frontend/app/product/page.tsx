'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Star, ShoppingCart, Eye, Download, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

function ProductView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState('');
  const [img, setImg] = useState('');
  const [pkgId, setPkgId] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/marketplace/product/${slug}`).then((d) => {
      setP(d); setImg(d.thumbnailUrl || d.screenshots?.[0]?.url || '');
      if (d.packages?.length) setPkgId(d.packages[0].id);
    }).catch((e) => setErr(e.message));
  }, [slug]);

  const packages: any[] = p?.packages || [];
  const selPkg = packages.find((x) => x.id === pkgId);
  const price = selPkg ? selPkg.gemPrice : (p?.isFree ? 0 : p?.gemPrice);

  async function buy() {
    if (!user) { setErr('Đăng nhập để mua'); return; }
    if (packages.length && !pkgId) { alert('Vui lòng chọn gói'); return; }
    const code = prompt('Mã giảm giá (bỏ trống nếu không):') || undefined;
    try {
      const r = await api.post<any>(`/marketplace/products/${p.id}/buy`, { couponCode: code, packageId: pkgId || undefined, fieldValues: vals });
      alert(`Mua thành công! Trả ${r.paid} gem.${r.deliveredContent ? '\nĐã giao: ' + r.deliveredContent : r.downloadUrl ? '\nTải: ' + r.downloadUrl : ''}`);
    }
    catch (e: any) { alert(e.message); }
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!p) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="card overflow-hidden">
          {img
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={img} alt={p.title} className="max-h-80 w-full object-cover" />
            : <div className="grid h-60 place-items-center text-ink-300"><ShoppingCart size={48} /></div>}
          {p.screenshots?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {[p.thumbnailUrl, ...p.screenshots.map((s: any) => s.url)].filter(Boolean).map((u: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" onClick={() => setImg(u)} className={`h-16 w-16 shrink-0 cursor-pointer rounded object-cover ${img === u ? 'ring-2 ring-brand-500' : ''}`} />
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Mô tả</h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">{p.descriptionRaw || p.description}</div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Đánh giá ({p.reviews.length})</h2>
          {p.reviews.length === 0 && <p className="text-sm text-ink-500">Chưa có đánh giá.</p>}
          {p.reviews.map((r: any) => (
            <div key={r.id} className="border-b border-ink-100 py-2 dark:border-ink-800">
              <span className="flex text-amber-500">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < r.rating ? 'currentColor' : 'none'} />)}</span>
              <p className="text-sm">{r.content}</p>
              {r.sellerReply && <p className="mt-1 rounded bg-ink-50 p-2 text-xs dark:bg-ink-900"><b>Shop:</b> {r.sellerReply}</p>}
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h1 className="text-xl font-bold">{p.title}</h1>
          {p.category && <span className="chip mt-1 bg-ink-200 text-ink-600">{p.category.name}</span>}

          {/* Chọn gói (nếu có) */}
          {packages.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium">Chọn gói</p>
              {packages.map((pk) => (
                <button key={pk.id} onClick={() => { setPkgId(pk.id); setVals({}); }}
                  className={`flex w-full items-start justify-between gap-2 rounded-xl border-2 p-3 text-left transition ${pkgId === pk.id ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-ink-200 dark:border-ink-700'}`}>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{pk.name}</span>
                    {pk.description && <span className="mt-0.5 block text-xs text-ink-500">{pk.description}</span>}
                  </span>
                  <span className="shrink-0 font-bold text-brand-600">{pk.gemPrice ? `${pk.gemPrice}` : 'Free'}</span>
                </button>
              ))}
              {/* Trường tuỳ chỉnh của gói đang chọn */}
              {selPkg?.fields?.length > 0 && (
                <div className="space-y-2 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
                  {selPkg.fields.map((f: any) => (
                    <label key={f.label} className="block text-sm">{f.label}{f.required && <span className="text-rose-500"> *</span>}
                      <input className="input mt-1" value={vals[f.label] || ''} onChange={(e) => setVals({ ...vals, [f.label]: e.target.value })} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="my-3 inline-flex items-center gap-1.5 text-2xl font-bold text-brand-600">{price ? <>{price} <Gem size={20} /></> : 'Miễn phí'}</div>
          <button onClick={buy} className="btn-primary w-full"><ShoppingCart size={16} /> Mua ngay</button>
          <div className="mt-3 flex gap-4 text-xs text-ink-500">
            <span className="flex items-center gap-1"><Eye size={13} /> {p.viewCount}</span>
            <span className="flex items-center gap-1"><Download size={13} /> {p.salesCount}</span>
            <span className="flex items-center gap-1"><Star size={13} /> {p.ratingAvg?.toFixed?.(1) ?? 0}</span>
          </div>
        </div>
        {p.storefront && (
          <Link href={`/store?slug=${p.storefront.slug}`} className="card flex items-center gap-2 p-4 hover:shadow-lg">
            <span className="font-medium">{p.storefront.name}</span>{p.storefront.isVerified && <BadgeCheck size={15} className="text-brand-500" />}
          </Link>
        )}
      </aside>
    </div>
  );
}

export default function ProductPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ProductView /></Suspense>;
}
