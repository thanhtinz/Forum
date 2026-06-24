'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Heart, Plus, Share2, ChevronDown, ChevronUp, Star, BookOpen, Clapperboard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const STATUS_LABEL: Record<string, string> = {
  RELEASING: 'Đang phát hành', FINISHED: 'Hoàn thành', NOT_YET_RELEASED: 'Sắp ra mắt', HIATUS: 'Tạm ngưng', CANCELLED: 'Đã huỷ',
};
const SEASON_LABEL: Record<string, string> = { WINTER: 'Đông', SPRING: 'Xuân', SUMMER: 'Hạ', FALL: 'Thu' };
const FORMAT_LABEL: Record<string, string> = {
  TV: 'TV', MOVIE: 'Phim lẻ', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', NOVEL: 'Light Novel', MANHUA: 'Manhua',
};

type TabId = 'episodes' | 'cast' | 'suggest';

function Detail() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const router = useRouter();
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
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

  const tabs: Array<{ id: TabId; label: string }> = [
    w.episodeList?.length > 0 || w.chapterList?.length > 0
      ? { id: 'episodes', label: w.episodeList?.length > 0 ? 'Tập phim' : 'Chương' }
      : null,
    chars.length > 0 ? { id: 'cast', label: 'Diễn viên' } : null,
    w.relatedFrom?.length > 0 ? { id: 'suggest', label: 'Đề xuất' } : null,
  ].filter(Boolean) as Array<{ id: TabId; label: string }>;

  const activeTab = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id ?? 'episodes';
  const ytId = w.trailerUrl?.match(/[?&]v=([\w-]+)/)?.[1];

  return (
    <div className="space-y-4">
      {/* ── Hero: banner + cover + title ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="h-52 w-full sm:h-64">
          {heroBg
            ? <img src={heroBg} alt="" className="h-full w-full object-cover object-top" /> // eslint-disable-line @next/next/no-img-element
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

      {/* ── Genres + info toggle ── */}
      <div className="flex flex-col items-center gap-2">
        {w.genres?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {w.genres.slice(0, 6).map((g: any) => (
              <a key={g.slug} href={`/anime?genre=${g.slug}`}
                className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-ink-800 dark:text-brand-300">
                {g.name}
              </a>
            ))}
          </div>
        )}
        <button onClick={() => setInfoOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400">
          Thông tin phim
          {infoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Collapsible info ── */}
      {infoOpen && (
        <div className="card space-y-1.5 p-4 text-sm">
          {w.avgScore > 0 && (
            <p className="mb-2 inline-flex items-center gap-1 font-semibold text-amber-600">
              <Star size={14} /> {w.avgScore.toFixed(2)}/5 ({w.ratingCount} lượt)
            </p>
          )}
          <InfoRow label="Loại" value={{ MANHUA: 'Manhua (Truyện TQ)', MANHWA: 'Manhwa', DONGHUA: 'Donghua (Hoạt hình TQ)' }[w.type as string] ?? w.type} />
          {w.format && <InfoRow label="Định dạng" value={FORMAT_LABEL[w.format] ?? w.format} />}
          <InfoRow label="Trạng thái" value={STATUS_LABEL[w.status] || w.status} />
          {w.episodes != null && <InfoRow label="Số tập" value={`${w.episodes} tập`} />}
          {w.duration != null && <InfoRow label="Thời lượng" value={`${w.duration} phút`} />}
          {w.chapters != null && <InfoRow label="Số chương" value={`${w.chapters} chương`} />}
          {w.seasonYear && <InfoRow label="Mùa" value={`${w.season ? SEASON_LABEL[w.season] + ' ' : ''}${w.seasonYear}`} />}
          {w.studios?.length > 0 && <InfoRow label="Studio" value={w.studios.map((s: any) => s.name).join(', ')} />}
          {w.source && <InfoRow label="Nguồn" value={w.source} />}
        </div>
      )}

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

      {/* ── Description ── */}
      {w.description && (
        <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-300">{w.description}</p>
      )}

      {/* ── Tab bar ── */}
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

          {/* Tab: Tập phim / Chương */}
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

          {/* Tab: Diễn viên */}
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

          {/* Tab: Đề xuất */}
          {activeTab === 'suggest' && w.relatedFrom?.length > 0 && (
            <div className="space-y-2 pt-1">
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-2">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </p>
  );
}

export default function AnimeDetailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><Detail /></Suspense>;
}
