'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Home, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { interceptExternalLink } from '@/lib/externalLink';

interface Chapter {
  id: string;
  number: number;
  title?: string | null;
  pages: string[];
  content?: string | null;
  prev?: { id: string; number: number } | null;
  next?: { id: string; number: number } | null;
  media: { slug: string; title: string; titleEnglish?: string | null; type: string };
}

interface ChapterItem {
  id: string;
  number: number;
  title?: string | null;
}

function ComicReaderInner() {
  const params = useSearchParams();
  const chapterId = params.get('id') ?? '';

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [chapterList, setChapterList] = useState<ChapterItem[]>([]);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chapterId) { setErr('Thiếu ID chương'); setLoading(false); return; }
    setLoading(true); setErr('');
    api.get<Chapter>(`/anime/chapter/${chapterId}`)
      .then((ch) => { setChapter(ch); })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapterId]);

  useEffect(() => {
    if (!chapter?.media.slug) return;
    api.get<any>(`/anime/${chapter.media.slug}`)
      .then((s) => setChapterList((s.chapterList ?? []).slice().reverse()))
      .catch(() => {});
  }, [chapter?.media.slug]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

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
  const prevId = chapter.prev?.id;
  const nextId = chapter.next?.id;

  const NavBtn = ({ href, children, disabled }: { href?: string; children: React.ReactNode; disabled?: boolean }) =>
    disabled || !href ? (
      <span className="flex items-center gap-1 rounded bg-white/5 px-3 py-1.5 text-sm text-white/30 select-none">{children}</span>
    ) : (
      <a href={href} className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 active:bg-white/30">{children}</a>
    );

  const BottomNav = () => (
    <div className="flex gap-3 bg-[#1a1a2e] p-4">
      {prevId ? (
        <a href={`/comic/read?id=${prevId}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10">
          <ChevronLeft size={16} /> Chương Trước
        </a>
      ) : (
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-3 text-sm text-white/20">
          <ChevronLeft size={16} /> Chương Trước
        </span>
      )}
      {nextId ? (
        <a href={`/comic/read?id=${nextId}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10">
          Chương Sau <ChevronRight size={16} />
        </a>
      ) : (
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-3 text-sm text-white/20">
          Chương Sau <ChevronRight size={16} />
        </span>
      )}
    </div>
  );

  const ChapterDropdown = () => (
    <div ref={dropRef} className="relative flex-1 min-w-0">
      <button
        onClick={() => setDropOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded border border-white/20 bg-white/10 px-2 py-1 text-center text-sm text-white"
      >
        <span className="flex-1 truncate">{chapterLabel}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
          {chapterList.map((ch) => (
            <a
              key={ch.id}
              href={`/comic/read?id=${ch.id}`}
              onClick={() => setDropOpen(false)}
              className={`flex items-center px-3 py-2.5 text-sm transition hover:bg-white/10 ${
                ch.id === chapter.id ? 'bg-white/5 text-brand-400' : 'text-white/80'
              }`}
            >
              <span className="flex-1">Chương {ch.number}{ch.title ? `: ${ch.title}` : ''}</span>
              {ch.id === chapter.id && <span className="ml-2 shrink-0 text-[10px] text-brand-400">▶ Đang đọc</span>}
            </a>
          ))}
        </div>
      )}
    </div>
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
          <ChapterDropdown />
          <NavBtn href={prevId ? `/comic/read?id=${prevId}` : undefined} disabled={!prevId}>
            <ChevronLeft size={14} /> Trước
          </NavBtn>
          <NavBtn href={nextId ? `/comic/read?id=${nextId}` : undefined} disabled={!nextId}>
            Sau <ChevronRight size={14} />
          </NavBtn>
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-12 pt-16">
          <h1 className="mb-1 text-center text-xl font-bold text-brand-400">{seriesTitle}</h1>
          <p className="mb-6 text-center text-sm text-white/50">{chapterLabel}</p>
          <div className="prose prose-invert max-w-none" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: chapter.content! }} />
        </div>

        <BottomNav />
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
        <ChapterDropdown />
        <NavBtn href={prevId ? `/comic/read?id=${prevId}` : undefined} disabled={!prevId}>
          <ChevronLeft size={14} /> Trước
        </NavBtn>
        <NavBtn href={nextId ? `/comic/read?id=${nextId}` : undefined} disabled={!nextId}>
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

      <BottomNav />
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
