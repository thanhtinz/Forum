'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Home, List } from 'lucide-react';
import { api } from '@/lib/api';

interface Chapter {
  id: string;
  number: number;
  title?: string | null;
  pages: string[];
  content?: string | null;
  prevId?: string | null;
  nextId?: string | null;
  media: { slug: string; title: string; titleEnglish?: string | null; type: string };
}

function ComicReaderInner() {
  const params = useSearchParams();
  const chapterId = params.get('id') ?? '';

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!chapterId) { setErr('Thiếu ID chương'); setLoading(false); return; }
    setLoading(true); setErr('');
    api.get<Chapter>(`/anime/chapter/${chapterId}`)
      .then((ch) => { setChapter(ch); })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#111]">
      <p className="text-white/50">Đang tải chương...</p>
    </div>
  );

  if (err || !chapter) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#111]">
      <p className="text-rose-400">{err || 'Không tìm thấy chương'}</p>
      <a href="/comic" className="text-sm text-brand-400 hover:underline">← Về trang truyện tranh</a>
    </div>
  );

  const seriesTitle = chapter.media.titleEnglish || chapter.media.title;
  const chapterLabel = `Chương ${chapter.number}${chapter.title ? `: ${chapter.title}` : ''}`;
  const backHref = `/comic/detail?slug=${chapter.media.slug}`;
  const isText = !!chapter.content && chapter.pages.length === 0;

  const NavBtn = ({ href, children, disabled }: { href?: string; children: React.ReactNode; disabled?: boolean }) =>
    disabled || !href ? (
      <span className="flex items-center gap-1 rounded bg-white/5 px-3 py-1.5 text-sm text-white/30 select-none">{children}</span>
    ) : (
      <a href={href} className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 active:bg-white/30">{children}</a>
    );

  // ── Text chapter ─────────────────────────────────────────────────────────
  if (isText) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 border-b border-white/10 bg-[#1a1a2e] px-3 py-2">
          <a href={backHref} className="grid h-8 w-8 shrink-0 place-items-center rounded text-white hover:bg-white/10">
            <Home size={18} />
          </a>
          <div className="min-w-0 flex-1 truncate text-center text-sm font-medium">{chapterLabel}</div>
          <NavBtn href={chapter.prevId ? `/comic/read?id=${chapter.prevId}` : undefined} disabled={!chapter.prevId}>
            <ChevronLeft size={14} /> Trước
          </NavBtn>
          <NavBtn href={chapter.nextId ? `/comic/read?id=${chapter.nextId}` : undefined} disabled={!chapter.nextId}>
            Sau <ChevronRight size={14} />
          </NavBtn>
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-12 pt-16">
          <h1 className="mb-1 text-center text-xl font-bold text-brand-400">{seriesTitle}</h1>
          <p className="mb-6 text-center text-sm text-white/50">{chapterLabel}</p>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: chapter.content! }} />
        </div>

        {/* Bottom */}
        <div className="flex gap-3 border-t border-white/10 bg-[#1a1a2e] p-4">
          <NavBtn href={chapter.prevId ? `/comic/read?id=${chapter.prevId}` : undefined} disabled={!chapter.prevId}>
            <ChevronLeft size={14} /> Chương Trước
          </NavBtn>
          <a href={backHref} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <List size={15} /> Chương Khác
          </a>
          <NavBtn href={chapter.nextId ? `/comic/read?id=${chapter.nextId}` : undefined} disabled={!chapter.nextId}>
            Sau <ChevronRight size={14} />
          </NavBtn>
        </div>
      </div>
    );
  }

  // ── Image chapter ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111]">
      {/* Top bar — always visible */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 border-b border-white/10 bg-[#1a1a2e] px-3 py-2">
        <a href={backHref} className="grid h-8 w-8 shrink-0 place-items-center rounded text-white hover:bg-white/10">
          <Home size={18} />
        </a>
        <div className="min-w-0 flex-1 truncate rounded border border-white/20 bg-white/10 px-2 py-1 text-center text-sm text-white">
          {chapterLabel}
        </div>
        <NavBtn href={chapter.prevId ? `/comic/read?id=${chapter.prevId}` : undefined} disabled={!chapter.prevId}>
          <ChevronLeft size={14} /> Trước
        </NavBtn>
        <NavBtn href={chapter.nextId ? `/comic/read?id=${chapter.nextId}` : undefined} disabled={!chapter.nextId}>
          Sau <ChevronRight size={14} />
        </NavBtn>
      </div>

      {/* Title banner — push below fixed top bar */}
      <div className="bg-[#0f0f1a] pb-3 pt-[52px] text-center">
        <p className="text-sm font-bold text-brand-400">{seriesTitle}</p>
        <p className="text-xs text-white/50">{chapterLabel}</p>
      </div>

      {/* Pages — full width, no gap */}
      <div className="flex flex-col">
        {chapter.pages.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`Trang ${i + 1}`}
            className="block w-full"
            loading={i < 3 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="bg-[#0f0f1a] py-5 text-center text-xs text-white/30">— Hết chương —</div>

      {/* Bottom actions */}
      <div className="flex gap-3 bg-[#1a1a2e] p-4">
        {chapter.prevId ? (
          <a href={`/comic/read?id=${chapter.prevId}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10">
            <ChevronLeft size={16} /> Chương Trước
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-3 text-sm text-white/20">
            <ChevronLeft size={16} /> Chương Trước
          </span>
        )}
        <a href={backHref}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-3 text-sm font-medium text-white hover:bg-brand-700">
          <List size={16} /> Chương Khác
        </a>
      </div>
    </div>
  );
}

export default function ComicReadPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#111] text-white/50">Đang tải...</div>}>
      <ComicReaderInner />
    </Suspense>
  );
}
