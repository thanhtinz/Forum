'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

function Reader() {
  const id = useSearchParams().get('ch') || '';
  const [ch, setCh] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (id) { setCh(null); api.get<any>(`/anime/chapter/${id}`).then((c) => { setCh(c); window.scrollTo(0, 0); }).catch((e) => setErr(e.message)); }
  }, [id]);

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!ch) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;

  const pages: string[] = ch.pages || [];
  const Nav = () => (
    <div className="flex items-center justify-between">
      {ch.prev ? <a href={`/anime/read?ch=${ch.prev.id}`} className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800"><ChevronLeft size={16} /> Ch. {ch.prev.number}</a> : <span />}
      {ch.next ? <a href={`/anime/read?ch=${ch.next.id}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white">Ch. {ch.next.number} <ChevronRight size={16} /></a> : <span />}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <a href={ch.media.type === 'MANHUA' ? `/manga/detail?slug=${ch.media.slug}` : `/anime/detail?slug=${ch.media.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> {ch.media.titleEnglish || ch.media.title}</a>
      <h1 className="text-xl font-bold">Chương {ch.number}{ch.title ? `: ${ch.title}` : ''}</h1>
      <Nav />

      {pages.length > 0 ? (
        <div className="space-y-1 bg-black/90 py-2">
          {pages.map((src, i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={src} alt={`Trang ${i + 1}`} className="mx-auto block max-w-full" loading="lazy" />)}
        </div>
      ) : ch.content ? (
        <article className="card prose prose-sm max-w-none p-6 leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: ch.content }} />
      ) : (
        <p className="card p-10 text-center text-ink-500">Chương này chưa có nội dung.</p>
      )}

      <Nav />
    </div>
  );
}

export default function ReadPage() {
  return <Suspense fallback={<p className="p-10 text-center text-ink-500">Đang tải…</p>}><Reader /></Suspense>;
}
