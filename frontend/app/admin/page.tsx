'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, Sprout, KeyRound, Settings, ShieldAlert, FolderTree, ChevronRight,
  MessageSquare, Gem, Activity, Sticker, Award,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Card, StatCard, Notice } from '@/components/admin/ui';

const LABELS: Record<string, string> = {
  users: 'Thành viên', total: 'Tổng', newToday: 'Mới hôm nay', newWeek: 'Mới tuần này', activeToday: 'Hoạt động hôm nay',
  forum: 'Diễn đàn', threads: 'Chủ đề', posts: 'Bài viết', moderation: 'Kiểm duyệt', pendingReports: 'Báo cáo chờ',
  gem: 'Gem', circulation: 'Đang lưu hành',
};
const humanize = (k: string) => LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const STAT_ICON: Record<string, any> = { users: Users, forum: MessageSquare, moderation: ShieldAlert, gem: Gem };

const QUICK = [
  { href: '/admin/forum-categories', label: 'Danh mục diễn đàn', icon: FolderTree },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/badges', label: 'Huy hiệu', icon: Award },
  { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
  { href: '/admin/stickers', label: 'Sticker chat', icon: Sticker },
  { href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard },
  { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound },
  { href: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings },
];

function flatten(stats: any): { group: string; label: string; value: string }[] {
  const out: { group: string; label: string; value: string }[] = [];
  for (const [group, val] of Object.entries(stats || {})) {
    if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val as any)) {
        if (v !== null && typeof v !== 'object') out.push({ group, label: `${humanize(group)} · ${humanize(k)}`, value: Number(v).toLocaleString() });
      }
    } else if (val !== null) {
      out.push({ group, label: humanize(group), value: String(val) });
    }
  }
  return out;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/stats').then(setStats).catch((e) => setErr(e.message)); }, []);

  const cards = stats ? flatten(stats) : [];

  return (
    <div className="space-y-6">
      <PageHeader icon={<Activity size={20} />} title="Bảng điều khiển" desc="Tổng quan hệ thống và lối tắt tới các khu quản trị." />

      {err && <Notice kind="error">Không tải được thống kê: {err}</Notice>}

      {cards.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Thống kê</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => {
              const Icon = STAT_ICON[c.group];
              return <StatCard key={c.label} label={c.label} value={c.value} icon={Icon ? <Icon size={16} /> : undefined} />;
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href}
              className="group flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40"><q.icon size={20} /></span>
              <span className="flex-1 text-sm font-medium">{q.label}</span>
              <ChevronRight size={16} className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
