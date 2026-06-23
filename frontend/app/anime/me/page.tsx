'use client';

import { useEffect, useState } from 'react';
import { Star, Heart, ListChecks, Film, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Entry {
  id: string; status: string; score: number | null; progress: number; favorite: boolean;
  media: { id: string; type: string; slug: string; title: string; titleEnglish?: string | null; coverUrl?: string | null; format?: string | null; episodes?: number | null; chapters?: number | null; avgScore: number };
}

const TYPE_TABS = [
  { v: '', label: 'Tất cả' },
  { v: 'ANIME', label: 'Anime' },
  { v: 'MANGA', label: 'Manga' },
  { v: 'DONGHUA', label: 'Donghua' },
  { v: 'MANHUA', label: 'Manhua' },
];
const STATUS_TABS = [
  { v: '', label: 'Tất cả' },
  { v: 'WATCHING', label: 'Đang xem' },
  { v: 'COMPLETED', label: 'Hoàn thành' },
  { v: 'PLANNING', label: 'Dự định' },
  { v: 'PAUSED', label: 'Tạm dừng' },
  { v: 'DROPPED', label: 'Bỏ dở' },
  { v: 'FAV', label: '❤ Yêu thích' },
];

const typeIcon = (t: string) => (t === 'MANGA' || t === 'MANHUA' ? <BookOpen size={13} /> : <Film size={13} />);

export default function MyList() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) { setBusy(false); return; }
    setBusy(true);
    const qs = new URLSearchParams();
    if (status === 'FAV') qs.set('favorite', 'true'); else if (status) qs.set('status', status);
    if (type) qs.set('type', type);
    api.get<Entry[]>(`/anime/me/list?${qs}`).then(setEntries).catch(() => setEntries([])).finally(() => setBusy(false));
  }, [user, type, status]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500"><a href="/login" className="font-medium text-brand-600 hover:underline">Đăng nhập</a> để xem danh sách của bạn.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks size={22} className="text-brand-600" />
        <h1 className="text-xl font-bold">Danh sách phim và truyện của tôi</h1>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((t) => (
          <button key={t.v} onClick={() => setType(t.v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${type === t.v ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button key={t.v} onClick={() => setStatus(t.v)}
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${status === t.v ? 'bg-ink-700 text-white dark:bg-ink-200 dark:text-ink-900' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>

      {busy ? <p className="p-8 text-center text-ink-500">Đang tải…</p>
        : entries.length === 0
          ? <p className="card p-10 text-center text-ink-500">Chưa có mục nào.{' '}
              Vào <a href="/anime" className="text-brand-600 hover:underline">Anime & Manga</a>{' '}
              hoặc <a href="/donghua" className="text-brand-600 hover:underline">Donghua & Manhua</a> để thêm.
            </p>
          : (
            <div className="space-y-2">
              {entries.map((e) => (
                <a key={e.id} href={`/anime/detail?slug=${e.media.slug}`} className="card flex items-center gap-3 p-2 hover:shadow-card">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-ink-100 dark:bg-ink-800">
                    {e.media.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.media.coverUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{e.media.titleEnglish || e.media.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                      {typeIcon(e.media.type)}
                      <span>{e.media.type}</span>
                      {e.media.format && <span>· {e.media.format}</span>}
                      <span>· Tiến độ {e.progress}{e.media.episodes ? `/${e.media.episodes}` : e.media.chapters ? `/${e.media.chapters}` : ''}</span>
                    </p>
                  </div>
                  {e.favorite && <Heart size={16} className="shrink-0 fill-rose-500 text-rose-500" />}
                  {e.score != null && <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-2 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Star size={12} /> {e.score}</span>}
                </a>
              ))}
            </div>
          )}
    </div>
  );
}
