'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';

interface MemberCard {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
  postCount: number;
  reputationScore: number;
  createdAt: string;
  trophyPoints?: number;
}

type SortBy = 'recent' | 'posts' | 'reputation' | 'trophies';

const TABS: { key: SortBy; label: string }[] = [
  { key: 'recent', label: 'Mới nhất' },
  { key: 'posts', label: 'Bài viết' },
  { key: 'reputation', label: 'Uy tín' },
  { key: 'trophies', label: 'Cúp' },
];

export default function MembersPage() {
  const [members, setMembers] = useState<MemberCard[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', limit: '48', sortBy });
    if (query.trim()) params.set('q', query.trim());
    api.get<{ data: MemberCard[] }>(`/social/members?${params.toString()}`)
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sortBy, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Thành viên</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); setQuery(q); }}
          className="relative"
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm thành viên…"
            className="input pl-9"
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSortBy(t.key)}
            className={`chip ${sortBy === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-ink-500">Đang tải…</div>
      ) : members.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">Không tìm thấy thành viên nào.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/profile?u=${m.username}`}
              className="card flex items-center gap-3 p-4 transition hover:shadow-md"
            >
              <Avatar user={m} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{m.displayName || m.username}</span>
                  {m.role && m.role !== 'MEMBER' && (
                    <span className="chip bg-brand-100 text-[11px] text-brand-700">{m.role}</span>
                  )}
                </div>
                <p className="truncate text-xs text-ink-500">@{m.username}</p>
                <div className="mt-1 flex gap-3 text-xs text-ink-500">
                  <span>{m.postCount} bài</span>
                  <span>{m.reputationScore} uy tín</span>
                  {sortBy === 'trophies' && m.trophyPoints != null && <span>{m.trophyPoints} cúp</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
