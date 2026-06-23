'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, List, ArrowLeft, Settings2, AlignJustify } from 'lucide-react';
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

type ReadMode = 'vertical' | 'horizontal';

function MangaReaderInner() {
  const params = useSearchParams();
  const chapterId = params.get('id') ?? '';

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<ReadMode>('vertical');
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chapterId) { setErr('Thiếu ID chương'); setLoading(false); return; }
    setLoading(true); setErr('');
    api.get<Chapter>(`/anime/chapter/${chapterId}`)
      .then((ch) => { setChapter(ch); setCurrentPage(0); })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapterId]);

  function showBar() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  useEffect(() => {
    if (mode === 'horizontal') { showBar(); }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, chapterId]);

  function prevPage() { if (currentPage > 0) { setCurrentPage((p) => p - 1); showBar(); } }
  function nextPage() { if (chapter && currentPage < chapter.pages.length - 1) { setCurrentPage((p) => p + 1); showBar(); } }

  function handleKeyDown(e: KeyboardEvent) {
    if (mode !== 'horizontal') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPage, chapter]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-ink-400">Đang tải chương...</p>
    </div>
  );

  if (err || !chapter) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-rose-500">{err || 'Không tìm thấy chương'}</p>
      <Link href="/truyen-tranh" className="text-sm text-brand-600 hover:underline">← Về trang truyện tranh</Link>
    </div>
  );

  const seriesTitle = chapter.media.titleEnglish || chapter.media.title;
  const chapterLabel = `Chương ${chapter.number}${chapter.title ? `: ${chapter.title}` : ''}`;
  const backHref = `/anime/detail?slug=${chapter.media.slug}`;
  const isText = !!chapter.content && chapter.pages.length === 0;

  // Text chapter
  if (isText) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href={backHref} className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-600">
            <ArrowLeft size={16} /> {seriesTitle}
          </Link>
        </div>
        <h1 className="mb-2 text-xl font-bold">{chapterLabel}</h1>
        <div className="prose prose-ink max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: chapter.content! }} />
        <div className="mt-8 flex justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
          {chapter.prevId
            ? <Link href={`/manga/read?id=${chapter.prevId}`} className="flex items-center gap-1 text-sm text-brand-600 hover:underline"><ChevronLeft size={16} /> Chương trước</Link>
            : <span />}
          {chapter.nextId
            ? <Link href={`/manga/read?id=${chapter.nextId}`} className="flex items-center gap-1 text-sm text-brand-600 hover:underline">Chương tiếp <ChevronRight size={16} /></Link>
            : <span />}
        </div>
      </div>
    );
  }

  // Image chapter — vertical scroll
  if (mode === 'vertical') {
    return (
      <div className="bg-black min-h-screen" onClick={showBar}>
        {/* Top bar */}
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-black/80 px-4 py-2.5 text-white backdrop-blur transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Link href={backHref} className="text-white/70 hover:text-white"><ArrowLeft size={18} /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{seriesTitle}</p>
            <p className="truncate text-xs text-white/60">{chapterLabel}</p>
          </div>
          <button onClick={() => setMode('horizontal')} title="Đọc ngang" className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
            <List size={18} />
          </button>
        </div>

        {/* Pages */}
        <div className="flex flex-col items-center pt-12">
          {chapter.pages.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt={`Trang ${i + 1}`} className="w-full max-w-2xl" loading={i < 3 ? 'eager' : 'lazy'} />
          ))}
        </div>

        {/* Bottom nav */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-black/80 px-4 py-3 text-white backdrop-blur transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {chapter.prevId
            ? <Link href={`/manga/read?id=${chapter.prevId}`} className="flex items-center gap-1 text-sm hover:text-brand-300"><ChevronLeft size={16} /> Trước</Link>
            : <span />}
          <p className="text-xs text-white/60">{chapter.pages.length} trang</p>
          {chapter.nextId
            ? <Link href={`/manga/read?id=${chapter.nextId}`} className="flex items-center gap-1 text-sm hover:text-brand-300">Tiếp <ChevronRight size={16} /></Link>
            : <span />}
        </div>
      </div>
    );
  }

  // Horizontal / page-flip mode
  const total = chapter.pages.length;
  return (
    <div className="relative flex h-screen items-center justify-center bg-black select-none" onClick={showBar}>
      {/* Top bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-black/80 px-4 py-2.5 text-white backdrop-blur transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Link href={backHref} className="text-white/70 hover:text-white"><ArrowLeft size={18} /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{seriesTitle}</p>
          <p className="truncate text-xs text-white/60">{chapterLabel}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setMode('vertical'); }} title="Đọc dọc" className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
          <AlignJustify size={18} />
        </button>
      </div>

      {/* Page image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={currentPage}
        src={chapter.pages[currentPage]}
        alt={`Trang ${currentPage + 1}`}
        className="max-h-screen max-w-full object-contain"
      />

      {/* Click zones */}
      <button className="absolute left-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); prevPage(); }} aria-label="Trang trước" />
      <button className="absolute right-0 top-0 h-full w-1/3" onClick={(e) => { e.stopPropagation(); nextPage(); }} aria-label="Trang tiếp" />

      {/* Bottom bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-black/80 px-4 py-3 text-white backdrop-blur transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {chapter.prevId
          ? <Link href={`/manga/read?id=${chapter.prevId}`} className="flex items-center gap-1 text-sm hover:text-brand-300" onClick={(e) => e.stopPropagation()}><ChevronLeft size={16} /> Trước</Link>
          : <span />}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <button onClick={(e) => { e.stopPropagation(); prevPage(); }} disabled={currentPage === 0} className="rounded p-1 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span>{currentPage + 1} / {total}</span>
          <button onClick={(e) => { e.stopPropagation(); nextPage(); }} disabled={currentPage >= total - 1} className="rounded p-1 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
        {chapter.nextId
          ? <Link href={`/manga/read?id=${chapter.nextId}`} className="flex items-center gap-1 text-sm hover:text-brand-300" onClick={(e) => e.stopPropagation()}>Tiếp <ChevronRight size={16} /></Link>
          : <span />}
      </div>
    </div>
  );
}

export default function MangaReadPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-ink-400">Đang tải...</div>}>
      <MangaReaderInner />
    </Suspense>
  );
}
