'use client';

import { useEffect, useState } from 'react';
import { Star, Heart, ListChecks, Film, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Entry {
  id: string; favorite: boolean; score: number | null;
  media: { id: string; type: string; slug: string; title: string; titleEnglish?: string | null; coverUrl?: string | null; format?: string | null; episodes?: number | null; chapters?: number | null; avgScore: number };
}

const TYPE_TABS = [
  { v: '', label: 'Tất cả' },
  { v: 'MANHUA', label: 'Truyện tranh' },
  { v: 'DONGHUA', label: 'Hoạt hình' },
  { v: 'FAV', label: '❤ Yêu thích' },
];

const typeIcon = (t: string) => (t === 'MANHUA' ? <BookOpen size={13} /> : <Film size={13} />);

export default function MyList() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) { setBusy(false); return; }
    setBusy(true);
    const qs = new URLSearchParams();
    if (tab === 'FAV') qs.set('favorite', 'true');
    else if (tab) qs.set('type', tab);
    api.get<Entry[]>(`/anime/me/list?${qs}`).then(setEntries).catch(() => setEntries([])).finally(() => setBusy(false));
  }, [user, tab]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500"><a href="/login" className="font-medium text-brand-600 hover:underline">Đăng nhập</a> để xem danh sách của bạn.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks size={22} className="text-brand-600" />
        <h1 className="text-xl font-bold">Danh sách theo dõi của tôi</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === t.v ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>

      {busy ? <p className="p-8 text-center text-ink-500">Đang tải…</p>
        : entries.length === 0
          ? <p className="card p-10 text-center text-ink-500">Chưa có mục nào.{' '}
              Vào <a href="/movie" className="text-brand-600 hover:underline">Hoạt hình TQ</a>{' '}
              hoặc <a href="/comic" className="text-brand-600 hover:underline">Truyện Tranh</a> để khám phá.
            </p>
          : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {entries.map((e) => (
                <a key={e.id} href={e.media.type === 'MANHUA' ? `/comic/detail?slug=${e.media.slug}` : `/movie/detail?slug=${e.media.slug}`} className="card group overflow-hidden p-0 transition hover:shadow-card">
                  <div className="relative aspect-[3/4] bg-ink-100 dark:bg-ink-800">
                    {e.media.coverUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={e.media.coverUrl} alt={e.media.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                      : <span className="grid h-full place-items-center text-ink-400">{typeIcon(e.media.type)}</span>}
                    {e.favorite && <span className="absolute left-1 top-1 text-rose-500"><Heart size={14} className="fill-rose-500" /></span>}
                    {e.score != null && <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-amber-300"><Star size={10} /> {e.score}</span>}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{e.media.titleEnglish || e.media.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">{typeIcon(e.media.type)} {e.media.type === 'MANHUA' ? 'Truyện tranh' : 'Hoạt hình'}{e.media.episodes ? ` · ${e.media.episodes} tập` : e.media.chapters ? ` · ${e.media.chapters} ch.` : ''}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
    </div>
  );
}
