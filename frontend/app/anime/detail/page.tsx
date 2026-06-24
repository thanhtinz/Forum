'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Heart, Plus, Share2, Star, BookOpen, Clapperboard, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const STATUS_LABEL: Record<string, string> = {
  RELEASING: 'Đang phát hành', FINISHED: 'Hoàn thành', NOT_YET_RELEASED: 'Sắp ra mắt', HIATUS: 'Tạm ngưng', CANCELLED: 'Đã huỷ',
};
const SEASON_LABEL: Record<string, string> = { WINTER: 'Đông', SPRING: 'Xuân', SUMMER: 'Hạ', FALL: 'Thu' };
const FORMAT_LABEL: Record<string, string> = {
  TV: 'TV', MOVIE: 'Phim lẻ', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', NOVEL: 'Light Novel', MANHUA: 'Manhua', DONGHUA: 'Donghua',
};
const TYPE_COUNTRY: Record<string, string> = { DONGHUA: 'Trung Quốc', MANHUA: 'Trung Quốc', MANHWA: 'Hàn Quốc' };

type TabId = 'episodes' | 'cast';

function Detail() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const router = useRouter();
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<TabId>('episodes');
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/anime/${slug}`).then(setW).catch((e) => setErr(e.message));
  }, [slug]);

  useEffect(() => {
    if (!user || !w?.id) return;
    api.get<any>(`/anime/me/entry/${w.id}`).then((e) => setFav(!!e?.favorite)).catch(() => {});
  }, [user, w?.id]);

  async function toggleFav() {
    if (!user) { router.push('/login'); return; }
    const next = !fav; setFav(next);
    try { await api.put(`/anime/me/entry/${w.id}`, { favorite: next }); } catch {}
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!w) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const firstEp = w.episodeList?.[0];
  const firstCh = w.chapterList?.[0];
  const chars = w.characters || [];
  const heroBg = w.bannerUrl || w.coverUrl;
  const airedCount = w.episodeList?.length ?? 0;
  const ytId = w.trailerUrl?.match(/[?&]v=([\w-]+)/)?.[1];

  const tabs: Array<{ id: TabId; label: string }> = [
    w.episodeList?.length > 0 || w.chapterList?.length > 0
      ? { id: 'episodes', label: w.episodeList?.length > 0 ? 'Tập phim' : 'Chương' }
      : null,
    chars.length > 0 ? { id: 'cast', label: 'Diễn viên' } : null,
  ].filter(Boolean) as Array<{ id: TabId; label: string }>;

  const activeTab = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id ?? 'episodes';

  return (
    <div className="space-y-4">
      {/* ── Hero: banner + cover + title ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="h-52 w-full sm:h-64">
          {heroBg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={heroBg} alt="" className="h-full w-full object-cover object-top" />
            : <div className="h-full bg-gradient-to-br from-brand-800 to-brand-600" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-4">
          <div className="h-32 w-[88px] overflow-hidden rounded-xl border border-white/25 shadow-2xl">
            {w.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover" />
              : <div className="h-full bg-ink-700" />}
          </div>
          <h1 className="mt-2 text-center text-xl font-bold leading-tight text-white drop-shadow-md">
            {w.titleEnglish || w.title}
          </h1>
          {w.titleEnglish && w.title && w.title !== w.titleEnglish && (
            <p className="text-center text-sm leading-tight text-white/70">{w.title}</p>
          )}
        </div>
      </div>

      {/* ── Meta badges ── */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {w.format && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs font-bold uppercase text-ink-600 dark:border-ink-600 dark:text-ink-300">
            {FORMAT_LABEL[w.format] ?? w.format}
          </span>
        )}
        {w.avgScore > 0 && (
          <span className="rounded-md border border-amber-400 px-2 py-0.5 text-xs font-bold text-amber-500">
            ★ {w.avgScore.toFixed(1)}
          </span>
        )}
        {w.seasonYear && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs text-ink-500 dark:border-ink-600 dark:text-ink-400">
            {w.seasonYear}
          </span>
        )}
        {w.episodes != null && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs text-ink-500 dark:border-ink-600 dark:text-ink-400">
            {w.episodeList?.length > 0 ? `Tập ${w.episodeList.length}` : `${w.episodes} tập`}
          </span>
        )}
      </div>

      {/* ── Genres ── */}
      {w.genres?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {w.genres.slice(0, 6).map((g: any) => (
            <a key={g.slug} href={`/anime?genre=${g.slug}`}
              className="rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-600 hover:border-amber-400 hover:text-amber-500 dark:border-ink-700 dark:text-ink-300">
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* ── Airing status pill ── */}
      {w.status === 'RELEASING' && airedCount > 0 && w.episodes && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
            <RefreshCw size={13} /> Đã chiếu: {airedCount} / {w.episodes} tập
          </span>
        </div>
      )}

      {/* ── Description ── */}
      {w.description && (
        <div>
          <p className="mb-1 font-bold">Giới thiệu:</p>
          <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{w.description}</p>
        </div>
      )}

      {/* ── Info rows ── */}
      <div className="space-y-1.5 text-sm">
        {w.duration != null && <MetaRow label="Thời lượng" value={`${w.duration}m`} />}
        {TYPE_COUNTRY[w.type] && <MetaRow label="Quốc gia" value={TYPE_COUNTRY[w.type]} />}
        {w.seasonYear && w.season && (
          <MetaRow label="Mùa" value={`${SEASON_LABEL[w.season] ?? w.season} ${w.seasonYear}`} />
        )}
        {w.studios?.length > 0 && <MetaRow label="Studio" value={w.studios.map((s: any) => s.name).join(', ')} />}
        {w.source && <MetaRow label="Nguồn" value={w.source} />}
      </div>

      {/* ── CTA ── */}
      {firstEp && (
        <a href={`/anime/watch?ep=${firstEp.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-amber-400 active:scale-95">
          <Play size={20} className="fill-white" /> Xem Ngay
        </a>
      )}
      {firstCh && !firstEp && (
        <a href={`/manga/read?id=${firstCh.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-amber-400 active:scale-95">
          <BookOpen size={20} /> Đọc Ngay
        </a>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center justify-around border-y border-ink-200/70 py-3 dark:border-ink-700">
        <button onClick={toggleFav} className="flex flex-col items-center gap-1 text-xs text-ink-600 dark:text-ink-300">
          <Heart size={22} className={fav ? 'fill-rose-500 text-rose-500' : ''} />
          <span>{fav ? 'Đã thích' : 'Yêu thích'}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-xs text-ink-600 dark:text-ink-300">
          <Plus size={22} /><span>Thêm vào</span>
        </button>
        <button
          onClick={() => { if (navigator.share) navigator.share({ title: w.title, url: window.location.href }).catch(() => {}); }}
          className="flex flex-col items-center gap-1 text-xs text-ink-600 dark:text-ink-300">
          <Share2 size={22} /><span>Chia sẻ</span>
        </button>
        {w.avgScore > 0 && (
          <div className="flex flex-col items-center gap-1 text-xs text-amber-500">
            <Star size={20} className="fill-amber-500" />
            <span className="font-bold">{w.avgScore.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* ── Episodes / Cast tabs ── */}
      {tabs.length > 0 && (
        <>
          <div className="flex border-b border-ink-200 dark:border-ink-700">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === t.id
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'episodes' && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {w.episodeList?.map((ep: any) => (
                <a key={ep.id} href={`/anime/watch?ep=${ep.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-amber-500 hover:text-white dark:bg-ink-800 dark:hover:bg-amber-500">
                  <Play size={11} className="shrink-0" /><span className="truncate">Tập {ep.number}</span>
                </a>
              ))}
              {w.chapterList?.map((ch: any) => (
                <a key={ch.id} href={`/manga/read?id=${ch.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-amber-500 hover:text-white dark:bg-ink-800 dark:hover:bg-amber-500">
                  <BookOpen size={11} className="shrink-0" /><span className="truncate">Ch. {ch.number}</span>
                </a>
              ))}
            </div>
          )}

          {activeTab === 'cast' && chars.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {chars.slice(0, 20).map((mc: any) => (
                <div key={mc.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2 dark:border-ink-800">
                  {mc.character.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mc.character.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{mc.character.name}</p>
                    <p className="text-[11px] text-ink-400">{mc.role === 'MAIN' ? 'Chính' : 'Phụ'}</p>
                    {mc.voiceActor && <p className="truncate text-[11px] text-ink-400">{mc.voiceActor.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Trailer ── */}
      {ytId && (
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><Clapperboard size={16} /> Trailer</h2>
          <div className="aspect-video overflow-hidden rounded-lg">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="h-full w-full" allowFullScreen title="Trailer" />
          </div>
        </div>
      )}

      {/* ── Phim liên quan ── */}
      {w.relatedFrom?.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Phim liên quan</h2>
          <div className="space-y-2">
            {w.relatedFrom.map((r: any) => (
              <a key={r.id} href={`/anime/detail?slug=${r.to.slug}`}
                className="flex items-center gap-3 rounded-xl border border-ink-200 p-2.5 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                  {r.to.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.to.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{r.to.titleEnglish || r.to.title}</p>
                  <p className="truncate text-sm text-ink-500">{r.to.title}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{r.type}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold">{label}: </span>
      <span className="text-ink-500">{value}</span>
    </p>
  );
}

export default function AnimeDetailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><Detail /></Suspense>;
}
