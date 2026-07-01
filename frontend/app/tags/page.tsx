'use client';

import { useEffect, useState } from 'react';
import { Hash, Search, Tag as TagIcon, Users, Check, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  usageCount: number;
  followerCount: number;
  isFollowing: boolean;
}

export default function TagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(query = '') {
    setLoading(true);
    try {
      const data = await api.get<TagItem[]>(`/forum/tags?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`);
      setTags(data);
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Tìm kiếm có debounce
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [q]);

  async function toggleFollow(tag: TagItem) {
    if (!user) return;
    setBusy(tag.id);
    try {
      const r = await api.post<{ following: boolean }>(`/forum/tags/${tag.id}/follow`, {});
      setTags((prev) => prev.map((t) => t.id === tag.id
        ? { ...t, isFollowing: r.following, followerCount: t.followerCount + (r.following ? 1 : -1) }
        : t));
    } catch {} finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold"><TagIcon size={20} className="text-brand-600" /> Thẻ</h1>
        <p className="mt-0.5 text-sm text-ink-500">Khám phá và theo dõi các thẻ bạn quan tâm.</p>
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm thẻ theo tên…"
            className="input w-full pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-ink-500">Đang tải…</div>
      ) : tags.length === 0 ? (
        <div className="card p-8 text-center text-ink-500">Không có thẻ nào.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <div key={tag.id} className="card flex flex-col gap-2 p-4">
              <a href={`/tag?slug=${encodeURIComponent(tag.slug)}`} className="flex items-center gap-1.5 font-semibold hover:text-brand-600">
                <Hash size={16} className="text-brand-500" /> {tag.name}
              </a>
              <div className="flex flex-wrap gap-3 text-xs text-ink-500">
                <span>{tag.usageCount} bài viết</span>
                <span className="flex items-center gap-1"><Users size={12} /> {tag.followerCount} người theo dõi</span>
              </div>
              {user && (
                <button
                  onClick={() => toggleFollow(tag)}
                  disabled={busy === tag.id}
                  className={`mt-1 flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                    tag.isFollowing ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'
                  }`}
                >
                  {tag.isFollowing ? <><Check size={14} /> Đang theo dõi</> : <><Plus size={14} /> Theo dõi</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
