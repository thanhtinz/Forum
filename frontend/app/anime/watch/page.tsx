'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

const ytId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] || null;

// Đưa link HLS qua proxy server để vượt chặn hotlink (CORS/Referer)
const hlsProxy = (u: string) => `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/anime/hls?u=${encodeURIComponent(u)}`;

// Trình phát hỗ trợ HLS (.m3u8) qua hls.js cho Chrome/Firefox, native cho Safari/iOS
function HlsVideo({ src: rawSrc }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = hlsProxy(rawSrc);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src; return; }
    let hls: any;
    let cancelled = false;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) { hls = new Hls(); hls.loadSource(src); hls.attachMedia(video); }
      else { video.src = src; }
    });
    return () => { cancelled = true; if (hls) hls.destroy(); };
  }, [src]);
  return <video ref={ref} controls className="h-full w-full" />;
}

function Watch() {
  const id = useSearchParams().get('ep') || '';
  const [ep, setEp] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (id) api.get<any>(`/anime/episode/${id}`).then(setEp).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!ep) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;

  const url: string = ep.videoUrl || '';
  const yt = url ? ytId(url) : null;
  const isHls = /\.m3u8(\?|$)/i.test(url);
  const isFile = /\.(mp4|webm)(\?|$)/i.test(url);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <a href={`/anime/detail?slug=${ep.media.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> {ep.media.titleEnglish || ep.media.title}</a>
      <h1 className="text-xl font-bold">Tập {ep.number}{ep.title ? `: ${ep.title}` : ''}</h1>

      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {!url ? <div className="grid h-full place-items-center text-ink-400">Chưa có link xem</div>
          : yt ? <iframe src={`https://www.youtube.com/embed/${yt}`} className="h-full w-full" allowFullScreen title="Player" />
          : isHls ? <HlsVideo src={url} />
          : isFile ? <video src={url} controls className="h-full w-full" />
          : <iframe src={url} className="h-full w-full" allowFullScreen title="Player" />}
      </div>

      <div className="flex items-center justify-between">
        {ep.prev ? <a href={`/anime/watch?ep=${ep.prev.id}`} className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-2 text-sm dark:bg-ink-800"><ChevronLeft size={16} /> Tập {ep.prev.number}</a> : <span />}
        {ep.next ? <a href={`/anime/watch?ep=${ep.next.id}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white">Tập {ep.next.number} <ChevronRight size={16} /></a> : <span />}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<p className="p-10 text-center text-ink-500">Đang tải…</p>}><Watch /></Suspense>;
}
