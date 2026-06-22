'use client';

import { useEffect, useState } from 'react';
import { Star, Heart, ListChecks } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Entry {
  id: string; status: string; score: number | null; progress: number; favorite: boolean;
  media: { id: string; type: string; slug: string; title: string; titleEnglish?: string | null; coverUrl?: string | null; format?: string | null; episodes?: number | null; chapters?: number | null; avgScore: number };
}
const TABS = [
  { v: '', label: 'Tất cả' },
  { v: 'WATCHING', label: 'Đang xem' },
  { v: 'COMPLETED', label: 'Hoàn thành' },
  { v: 'PLANNING', label: 'Dự định' },
  { v: 'PAUSED', label: 'Tạm dừng' },
  { v: 'DROPPED', label: 'Bỏ dở' },
  { v: 'FAV', label: '❤ Yêu thích' },
];

export default function MyAnimeList() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) { setBusy(false); return; }
    setBusy(true);
    const qs = new URLSearchParams();
    if (tab === 'FAV') qs.set('favorite', 'true'); else if (tab) qs.set('status', tab);
    api.get<Entry[]>(`/anime/me/list?${qs}`).then(setEntries).catch(() => setEntries([])).finally(() => setBusy(false));
  }, [user, tab]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500"><a href="/login" className="font-medium text-brand-600 hover:underline">Đăng nhập</a> để xem danh sách của bạn.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><ListChecks size={22} className="text-brand-600" /><h1 className="text-2xl font-bold">Danh sách của tôi</h1></div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t.v ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>

      {busy ? <p className="p-8 text-center text-ink-500">Đang tải…</p>
        : entries.length === 0 ? <p className="card p-10 text-center text-ink-500">Chưa có mục nào. Vào trang <a href="/anime" className="text-brand-600 hover:underline">Anime</a> để thêm.</p>
        : (
          <div className="space-y-2">
            {entries.map((e) => (
              <a key={e.id} href={`/anime/detail?slug=${e.media.slug}`} className="card flex items-center gap-3 p-2 hover:shadow-card">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-ink-100 dark:bg-ink-800">
                  {e.media.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.media.coverUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium">{e.media.titleEnglish || e.media.title}</p>
                  <p className="text-xs text-ink-400">{e.media.type} · {e.media.format || ''} · Tiến độ {e.progress}{e.media.episodes ? `/${e.media.episodes}` : e.media.chapters ? `/${e.media.chapters}` : ''}</p>
                </div>
                {e.favorite && <Heart size={16} className="fill-rose-500 text-rose-500" />}
                {e.score != null && <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-2 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Star size={12} /> {e.score}</span>}
              </a>
            ))}
          </div>
        )}
    </div>
  );
}
