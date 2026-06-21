'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { interceptExternalLink } from '@/lib/externalLink';

interface Page { title: string; html: string; updatedAt: string }

function PageView() {
  const slug = useSearchParams().get('slug') || '';
  const [page, setPage] = useState<Page | null>(null);
  const [state, setState] = useState<'load' | 'ok' | 'err'>('load');

  useEffect(() => {
    if (!slug) { setState('err'); return; }
    api.get<Page>(`/pages/${slug}`).then((p) => { setPage(p); setState('ok'); }).catch(() => setState('err'));
  }, [slug]);

  if (state === 'load') return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (state === 'err' || !page) return <div className="card p-8 text-center text-ink-500">Trang không tồn tại.</div>;

  return (
    <article className="card p-6">
      <h1 className="text-2xl font-bold">{page.title}</h1>
      <div className="prose prose-sm mt-4 max-w-none dark:prose-invert" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  );
}

export default function PublicPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <PageView />
    </Suspense>
  );
}
