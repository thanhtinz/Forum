'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, Sprout, KeyRound, Settings, ShieldAlert, FolderTree,
  MessageSquare, Gem, Activity, Sticker, Award, FileText, Tv, BookOpen,
  Tag, CalendarCheck, Gift, Square, Megaphone, MessageCircle, Paperclip,
  Mail, BellRing, ShieldCheck, BadgeCheck, Ticket, LayoutDashboard,
  TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle, ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api';

const LABELS: Record<string, string> = {
  users: 'Thành viên', total: 'Tổng', newToday: 'Mới hôm nay', newWeek: 'Mới tuần',
  activeToday: 'Hoạt động', forum: 'Diễn đàn', threads: 'Chủ đề', posts: 'Bài viết',
  moderation: 'Kiểm duyệt', pendingReports: 'Báo cáo chờ', gem: 'Gem', circulation: 'Lưu hành',
};
const humanize = (k: string) => LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const STAT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  users:      { bg: 'bg-sky-50 dark:bg-sky-950/40',     text: 'text-sky-600 dark:text-sky-400',     icon: 'bg-sky-100 dark:bg-sky-900' },
  forum:      { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', icon: 'bg-emerald-100 dark:bg-emerald-900' },
  moderation: { bg: 'bg-rose-50 dark:bg-rose-950/40',   text: 'text-rose-600 dark:text-rose-400',   icon: 'bg-rose-100 dark:bg-rose-900' },
  gem:        { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400', icon: 'bg-violet-100 dark:bg-violet-900' },
};

const STAT_ICONS: Record<string, any> = {
  users: Users, forum: MessageSquare, moderation: ShieldAlert, gem: Gem,
};

const QUICK_GROUPS = [
  {
    title: 'Nội dung', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800',
    items: [
      { href: '/admin/forum-categories', label: 'Danh mục', icon: FolderTree, color: 'text-emerald-600' },
      { href: '/admin/pages', label: 'Trang & Menu', icon: FileText, color: 'text-emerald-600' },
      { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert, color: 'text-rose-600' },
      { href: '/admin/anime', label: 'Donghua', icon: Tv, color: 'text-violet-600' },
      { href: '/admin/comic', label: 'Truyện tranh', icon: BookOpen, color: 'text-amber-600' },
      { href: '/admin/genres', label: 'Thể loại', icon: Tag, color: 'text-teal-600' },
    ],
  },
  {
    title: 'Game & Giải trí', color: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800',
    items: [
      { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout, color: 'text-green-600' },
      { href: '/admin/stickers', label: 'Sticker', icon: Sticker, color: 'text-pink-600' },
      { href: '/admin/checkin', label: 'Điểm danh', icon: CalendarCheck, color: 'text-sky-600' },
      { href: '/admin/giftcode', label: 'Giftcode', icon: Gift, color: 'text-amber-600' },
      { href: '/admin/frames', label: 'Khung avatar', icon: Square, color: 'text-violet-600' },
      { href: '/admin/banners', label: 'Banner', icon: Megaphone, color: 'text-orange-600' },
    ],
  },
  {
    title: 'Thành viên', color: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800',
    items: [
      { href: '/admin/users', label: 'Người dùng', icon: Users, color: 'text-sky-600' },
      { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound, color: 'text-amber-600' },
      { href: '/admin/badges', label: 'Huy hiệu', icon: Award, color: 'text-amber-500' },
      { href: '/admin/verification', label: 'Xác minh', icon: BadgeCheck, color: 'text-emerald-600' },
      { href: '/admin/invites', label: 'Mã mời', icon: Ticket, color: 'text-violet-600' },
      { href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard, color: 'text-green-600' },
    ],
  },
  {
    title: 'Hệ thống', color: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700',
    items: [
      { href: '/admin/settings', label: 'Cấu hình', icon: Settings, color: 'text-slate-600' },
      { href: '/admin/attachment', label: 'Lưu trữ R2', icon: Paperclip, color: 'text-sky-600' },
      { href: '/admin/mail', label: 'Email / SMTP', icon: Mail, color: 'text-rose-600' },
      { href: '/admin/push', label: 'Web Push', icon: BellRing, color: 'text-violet-600' },
      { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck, color: 'text-emerald-600' },
    ],
  },
];

function StatBlock({ group, label, value, icon: Icon }: { group: string; label: string; value: string; icon?: any }) {
  const c = STAT_COLORS[group] || STAT_COLORS['forum'];
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white p-4 dark:border-ink-800 dark:bg-ink-900`}>
      {Icon && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.icon}`}>
          <Icon size={18} className={c.text} />
        </span>
      )}
      <div className="min-w-0">
        <div className={`text-xl font-bold ${c.text}`}>{value}</div>
        <div className="truncate text-xs text-ink-500">{label}</div>
      </div>
    </div>
  );
}

function flatten(stats: any): { group: string; label: string; value: string }[] {
  const out: { group: string; label: string; value: string }[] = [];
  for (const [group, val] of Object.entries(stats || {})) {
    if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val as any)) {
        if (v !== null && typeof v !== 'object')
          out.push({ group, label: humanize(k), value: Number(v).toLocaleString() });
      }
    } else if (val !== null) {
      out.push({ group, label: humanize(group), value: String(val) });
    }
  }
  return out;
}

function groupStats(stats: any): { group: string; title: string; items: { label: string; value: string }[] }[] {
  const groups: Record<string, { title: string; items: { label: string; value: string }[] }> = {};
  for (const [group, val] of Object.entries(stats || {})) {
    if (val && typeof val === 'object') {
      groups[group] = { title: humanize(group), items: [] };
      for (const [k, v] of Object.entries(val as any)) {
        if (v !== null && typeof v !== 'object')
          groups[group].items.push({ label: humanize(k), value: Number(v).toLocaleString() });
      }
    }
  }
  return Object.entries(groups).map(([group, data]) => ({ group, ...data }));
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/stats').then(setStats).catch((e) => setErr(e.message)); }, []);

  const statGroups = stats ? groupStats(stats) : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-600 text-white shadow">
          <LayoutDashboard size={18} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-ink-900 dark:text-white">Bảng điều khiển</h1>
          <p className="text-sm text-ink-500">Tổng quan hệ thống và truy cập nhanh</p>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle size={16} /> Không tải được thống kê: {err}
        </div>
      )}

      {/* Stats by group */}
      {statGroups.map((sg) => {
        const Icon = STAT_ICONS[sg.group];
        const c = STAT_COLORS[sg.group] || STAT_COLORS['forum'];
        return (
          <section key={sg.group}>
            <div className="mb-2 flex items-center gap-2">
              {Icon && <Icon size={15} className={c.text} />}
              <h2 className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>{sg.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {sg.items.map((item) => (
                <StatBlock key={item.label} group={sg.group} label={item.label} value={item.value} icon={Icon} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Quick access grouped */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">Truy cập nhanh</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {QUICK_GROUPS.map((qg) => (
            <div key={qg.title} className={`overflow-hidden rounded-xl border bg-white dark:bg-ink-900 ${qg.border}`}>
              <div className={`border-b px-4 py-2 text-xs font-bold uppercase tracking-wider ${qg.color} ${qg.border} bg-ink-50/50 dark:bg-ink-800/50`}>
                {qg.title}
              </div>
              <div className="grid grid-cols-2 gap-px bg-ink-100 dark:bg-ink-800 sm:grid-cols-3">
                {qg.items.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="group flex items-center gap-2.5 bg-white px-3 py-2.5 transition hover:bg-ink-50 dark:bg-ink-900 dark:hover:bg-ink-800"
                  >
                    <q.icon size={15} className={q.color} />
                    <span className="text-sm font-medium text-ink-700 group-hover:text-ink-900 dark:text-ink-300 dark:group-hover:text-white">{q.label}</span>
                    <ArrowUpRight size={12} className="ml-auto text-ink-300 opacity-0 transition group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
