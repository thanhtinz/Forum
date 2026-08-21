'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface Shot {
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

/** Gallery ảnh chụp màn hình: lazy-load, click để mở lightbox, điều hướng bằng phím. */
export function GameGallery({ shots }: { shots: Shot[] }) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex((i) => (i === null ? null : (i + 1) % shots.length));
      if (e.key === 'ArrowLeft') setIndex((i) => (i === null ? null : (i - 1 + shots.length) % shots.length));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, shots.length]);

  if (shots.length === 0) return <p className="text-sm text-ink-400">Chưa có ảnh chụp màn hình.</p>;

  return (
    <>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {shots.map((s, i) => (
          <button
            key={s.url + i}
            type="button"
            onClick={() => setIndex(i)}
            className="shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-950/5 transition hover:-translate-y-0.5 dark:border-ink-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.caption ?? `Ảnh ${i + 1}`}
              loading="lazy"
              className="h-40 w-auto max-w-none object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" onClick={() => setIndex(null)}>
          <button type="button" aria-label="Đóng" className="absolute right-4 top-4 text-white/80 hover:text-white">
            <X size={26} />
          </button>
          {shots.length > 1 && (
            <>
              <button
                type="button" aria-label="Ảnh trước"
                className="absolute left-3 text-white/70 hover:text-white"
                onClick={(e) => { e.stopPropagation(); setIndex((i) => (i! - 1 + shots.length) % shots.length); }}
              >
                <ChevronLeft size={34} />
              </button>
              <button
                type="button" aria-label="Ảnh sau"
                className="absolute right-3 text-white/70 hover:text-white"
                onClick={(e) => { e.stopPropagation(); setIndex((i) => (i! + 1) % shots.length); }}
              >
                <ChevronRight size={34} />
              </button>
            </>
          )}
          <figure onClick={(e) => e.stopPropagation()} className="max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shots[index]!.url}
              alt={shots[index]!.caption ?? ''}
              className="mx-auto max-h-[78vh] w-auto object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <figcaption className="mt-3 text-center text-sm text-white/70">
              {shots[index]!.caption ?? `Ảnh ${index + 1}/${shots.length}`}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
