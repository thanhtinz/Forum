'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, MessageSquare, FileText, Wifi, UserPlus, Heart, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';

interface UserBasic {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role?: string;
}

interface ForumStats {
  totalMembers: number;
  totalThreads: number;
  totalPosts: number;
  newestMember: UserBasic | null;
  onlineCount: number;
}

interface OnlineResp {
  total: number;
  users: (UserBasic & { lastSeenAt: string })[];
}

interface ReactionRow extends UserBasic {
  reactionsReceived: number;
}
interface ContributorRow extends UserBasic {
  postCount: number;
}

type Period = 'week' | 'month' | 'all';
type Tab = 'reactions' | 'contributors';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'all', label: 'Tất cả' },
];

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-lg font-bold">{value}</div>
        <div className="text-xs text-ink-500">{label}</div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [online, setOnline] = useState<OnlineResp | null>(null);

  const [tab, setTab] = useState<Tab>('reactions');
  const [period, setPeriod] = useState<Period>('week');
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [contributors, setContributors] = useState<ContributorRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);

  useEffect(() => {
    api.get<ForumStats>('/community/stats').then(setStats).catch(() => {});
    api.get<OnlineResp>('/community/online').then(setOnline).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingBoard(true);
    if (tab === 'reactions') {
      api
        .get<{ data: ReactionRow[] }>(`/community/reaction-leaderboard?period=${period}&limit=20`)
        .then((r) => setReactions(r.data))
        .catch(() => setReactions([]))
        .finally(() => setLoadingBoard(false));
    } else {
      api
        .get<{ data: ContributorRow[] }>(`/community/top-contributors?period=${period}&limit=20`)
        .then((r) => setContributors(r.data))
        .catch(() => setContributors([]))
        .finally(() => setLoadingBoard(false));
    }
  }, [tab, period]);

  const rows: (UserBasic & { metric: number })[] =
    tab === 'reactions'
      ? reactions.map((r) => ({ ...r, metric: r.reactionsReceived }))
      : contributors.map((c) => ({ ...c, metric: c.postCount }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Cộng đồng</h1>

      {/* Số liệu tổng quan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Users size={18} />} label="Thành viên" value={stats?.totalMembers ?? '—'} />
        <StatCard icon={<MessageSquare size={18} />} label="Chủ đề" value={stats?.totalThreads ?? '—'} />
        <StatCard icon={<FileText size={18} />} label="Bài viết" value={stats?.totalPosts ?? '—'} />
        <StatCard icon={<Wifi size={18} />} label="Đang online" value={stats?.onlineCount ?? '—'} />
        <StatCard
          icon={<UserPlus size={18} />}
          label="Thành viên mới nhất"
          value={
            stats?.newestMember ? (
              <Link href={`/profile?u=${stats.newestMember.username}`} className="hover:underline">
                {stats.newestMember.displayName || stats.newestMember.username}
              </Link>
            ) : (
              '—'
            )
          }
        />
      </div>

      {/* Đang trực tuyến */}
      <section className="card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Đang trực tuyến
          {online && <span className="text-sm font-normal text-ink-500">({online.total})</span>}
        </h2>
        {!online ? (
          <p className="text-sm text-ink-500">Đang tải…</p>
        ) : online.users.length === 0 ? (
          <p className="text-sm text-ink-500">Hiện không có ai trực tuyến.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {online.users.map((u) => (
              <Link
                key={u.id}
                href={`/profile?u=${u.username}`}
                className="chip flex items-center gap-1.5 bg-ink-100 text-ink-700 transition hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
              >
                <Avatar user={u} size={20} />
                <span className="max-w-[120px] truncate">{u.displayName || u.username}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bảng xếp hạng */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('reactions')}
              className={`chip flex items-center gap-1.5 ${tab === 'reactions' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
            >
              <Heart size={14} /> Nhiều cảm xúc nhất
            </button>
            <button
              onClick={() => setTab('contributors')}
              className={`chip flex items-center gap-1.5 ${tab === 'contributors' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
            >
              <Award size={14} /> Đóng góp nhiều nhất
            </button>
          </div>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`chip ${period === p.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loadingBoard ? (
          <p className="py-6 text-center text-sm text-ink-500">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">Chưa có dữ liệu.</p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((u, i) => (
              <li key={u.id}>
                <Link
                  href={`/profile?u=${u.username}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <span
                    className={`w-6 text-center font-bold ${i < 3 ? 'text-brand-600' : 'text-ink-400'}`}
                  >
                    {i + 1}
                  </span>
                  <Avatar user={u} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.displayName || u.username}</div>
                    <div className="truncate text-xs text-ink-500">@{u.username}</div>
                  </div>
                  <span className="chip bg-brand-100 text-brand-700">
                    {tab === 'reactions' ? `${u.metric} cảm xúc` : `${u.metric} bài`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
