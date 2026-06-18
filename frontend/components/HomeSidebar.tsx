'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Newspaper, Users, BarChart3, Image, Tag, Award, MessageSquare, FileText, MessagesSquare, UserPlus } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { Avatar } from './Header';

interface ForumStats {
  totalMembers: number;
  totalThreads: number;
  totalPosts: number;
  onlineCount: number;
  newestMember?: { id: string; username: string; displayName?: string | null; avatar?: string | null } | null;
}
interface MemberCard {
  id: string; username: string; displayName: string | null; avatar: string | null; createdAt: string;
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-2 text-ink-500">{icon} {label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export function HomeSidebar() {
  const { data: stats } = useSWR<ForumStats>('/community/stats', fetcher);
  const { data: members } = useSWR<{ data: MemberCard[] }>('/social/members?page=1&limit=6&sortBy=recent', fetcher);

  const comments = stats ? Math.max(0, stats.totalPosts - stats.totalThreads) : 0;

  return (
    <aside className="space-y-4">
      {/* Cộng đồng (giữ nguyên như cũ) */}
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Cộng đồng</h3>
        <div className="flex flex-col gap-1">
          <Link href="/feed" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Newspaper size={16} className="text-brand-600" /> Bảng tin</Link>
          <Link href="/members" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Users size={16} className="text-emerald-600" /> Thành viên</Link>
          <Link href="/community" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><BarChart3 size={16} className="text-sky-600" /> Cộng đồng</Link>
          <Link href="/gallery" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Image size={16} className="text-rose-600" /> Thư viện ảnh</Link>
          <Link href="/tags" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Tag size={16} className="text-fuchsia-600" /> Thẻ</Link>
          <Link href="/levels" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Award size={16} className="text-amber-600" /> Cấp độ</Link>
        </div>
      </div>

      {/* Thống kê diễn đàn */}
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Thống kê</h3>
        <div className="divide-y divide-ink-200/70 dark:divide-ink-800">
          <StatRow icon={<FileText size={15} className="text-brand-600" />} label="Bài viết" value={stats?.totalPosts ?? '—'} />
          <StatRow icon={<MessageSquare size={15} className="text-sky-600" />} label="Chủ đề" value={stats?.totalThreads ?? '—'} />
          <StatRow icon={<MessagesSquare size={15} className="text-emerald-600" />} label="Bình luận" value={stats ? comments : '—'} />
          <StatRow icon={<Users size={15} className="text-amber-600" />} label="Thành viên" value={stats?.totalMembers ?? '—'} />
        </div>
      </div>

      {/* Thành viên mới */}
      <div className="card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          <UserPlus size={15} /> Thành viên mới
        </h3>
        <div className="flex flex-col gap-1">
          {members?.data?.slice(0, 6).map((m) => (
            <Link key={m.id} href={`/profile?u=${m.username}`} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800">
              <Avatar user={m} size={28} />
              <span className="truncate text-sm font-medium">{m.displayName || m.username}</span>
            </Link>
          ))}
          {(!members || members.data.length === 0) && <p className="text-sm text-ink-400">Chưa có dữ liệu.</p>}
        </div>
      </div>
    </aside>
  );
}
