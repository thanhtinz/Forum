'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Star, Calendar, Film, Clapperboard, Users, Play, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import EntryControls from '@/components/anime/EntryControls';

const STATUS_LABEL: Record<string, string> = {
  RELEASING: 'Đang phát hành', FINISHED: 'Hoàn thành', NOT_YET_RELEASED: 'Sắp ra mắt', HIATUS: 'Tạm ngưng', CANCELLED: 'Đã huỷ',
};
const SEASON_LABEL: Record<string, string> = { WINTER: 'Đông', SPRING: 'Xuân', SUMMER: 'Hạ', FALL: 'Thu' };
const ytId = (url?: string | null) => url?.match(/[?&]v=([\w-]+)/)?.[1] || null;

function Detail() {
  const slug = useSearchParams().get('slug') || '';
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/anime/${slug}`).then(setW).catch((e) => setErr(e.message));
  }, [slug]);

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!w) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const yt = ytId(w.trailerUrl);
  const mainChars = (w.characters || []).filter((c: any) => c.role === 'MAIN');
  const otherChars = (w.characters || []).filter((c: any) => c.role !== 'MAIN');

  return (
    <div className="space-y-5">
      {w.bannerUrl && <div className="h-40 w-full overflow-hidden rounded-2xl sm:h-56">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={w.bannerUrl} alt="" className="h-full w-full object-cover" /></div>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
            {w.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover" />}
          </div>
          <EntryControls mediaId={w.id} max={w.episodes ?? w.chapters} />
          <div className="card space-y-1.5 p-4 text-sm">
            {w.avgScore > 0 && <p className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star size={15} /> {w.avgScore.toFixed(2)}/5 ({w.ratingCount})</p>}
            <Row label="Loại" value={{ MANGA: 'Manga', ANIME: 'Anime', MANHUA: 'Manhua', DONGHUA: 'Donghua' }[w.type as string] ?? w.type} />
            {w.format && <Row label="Định dạng" value={w.format} />}
            <Row label="Trạng thái" value={STATUS_LABEL[w.status] || w.status} />
            {w.episodes != null && <Row label="Số tập" value={String(w.episodes)} />}
            {w.duration != null && <Row label="Thời lượng" value={`${w.duration} phút`} />}
            {w.chapters != null && <Row label="Số chương" value={String(w.chapters)} />}
            {w.volumes != null && <Row label="Số tập (vol)" value={String(w.volumes)} />}
            {w.seasonYear && <Row label="Mùa" value={`${w.season ? SEASON_LABEL[w.season] + ' ' : ''}${w.seasonYear}`} />}
            {w.startDate && <Row label="Phát hành" value={new Date(w.startDate).toLocaleDateString('vi')} />}
            {w.studios?.length > 0 && <Row label="Studio" value={w.studios.map((s: any) => s.name).join(', ')} />}
            {w.source && <Row label="Nguồn" value={w.source} />}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{w.titleEnglish || w.title}</h1>
            <p className="text-sm text-ink-500">{w.title}{w.titleNative ? ` · ${w.titleNative}` : ''}</p>
            {w.genres?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {w.genres.map((g: any) => <a key={g.slug} href={`/anime?genre=${g.slug}`} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-ink-800 dark:text-brand-300">{g.name}</a>)}
              </div>
            )}
          </div>

          {w.episodeList?.length > 0 && (
            <a href={`/anime/watch?ep=${w.episodeList[0].id}`} className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-700">
              <Play size={20} className="fill-white" /> Xem phim ({w.episodeList.length} tập)
            </a>
          )}
          {w.chapterList?.length > 0 && (
            <a href={`/anime/read?ch=${w.chapterList[0].id}`} className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-700">
              <BookOpen size={20} /> Đọc truyện ({w.chapterList.length} chương)
            </a>
          )}

          {w.description && <div className="card p-5"><h2 className="mb-2 font-semibold">Nội dung</h2><p className="whitespace-pre-line text-sm leading-relaxed text-ink-700 dark:text-ink-200">{w.description}</p></div>}

          {yt && (
            <div className="card p-5">
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold"><Clapperboard size={16} /> Trailer</h2>
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <iframe src={`https://www.youtube.com/embed/${yt}`} className="h-full w-full" allowFullScreen title="Trailer" />
              </div>
            </div>
          )}

          {mainChars.length + otherChars.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><Users size={16} /> Nhân vật & Lồng tiếng</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[...mainChars, ...otherChars].slice(0, 24).map((mc: any) => (
                  <div key={mc.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 dark:border-ink-800">
                    <a href={`/anime?search=${encodeURIComponent(mc.character.name)}`} className="flex min-w-0 flex-1 items-center gap-2">
                      {mc.character.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mc.character.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{mc.character.name}</p><p className="text-[11px] text-ink-400">{mc.role === 'MAIN' ? 'Chính' : 'Phụ'}</p></div>
                    </a>
                    {mc.voiceActor && (
                      <div className="flex min-w-0 items-center gap-2 text-right">
                        <div className="min-w-0"><p className="truncate text-sm">{mc.voiceActor.name}</p><p className="text-[11px] text-ink-400">Seiyuu</p></div>
                        {mc.voiceActor.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mc.voiceActor.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {w.staff?.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold">Ê-kíp / Tác giả</h2>
              <div className="flex flex-wrap gap-3">
                {w.staff.slice(0, 16).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2">
                    {s.person.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.person.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />}
                    <div><p className="text-sm font-medium">{s.person.name}</p><p className="text-[11px] text-ink-400">{s.role}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {w.relatedFrom?.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold">Liên quan</h2>
              <div className="flex flex-wrap gap-3">
                {w.relatedFrom.map((r: any) => (
                  <a key={r.id} href={`/anime/detail?slug=${r.to.slug}`} className="w-24">
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">{r.to.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.to.coverUrl} alt="" className="h-full w-full object-cover" />}</div>
                    <p className="mt-1 line-clamp-2 text-[11px]">{r.type} · {r.to.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <p className="flex justify-between gap-2"><span className="text-ink-500">{label}</span><span className="text-right font-medium">{value}</span></p>;
}

export default function AnimeDetailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><Detail /></Suspense>;
}
