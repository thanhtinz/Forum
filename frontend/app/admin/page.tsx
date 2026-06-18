'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Store, CreditCard, Sprout, KeyRound, Settings, ShieldAlert, FolderTree, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

// Nhãn tiếng Việt cho các khóa thống kê thường gặp
const LABELS: Record<string, string> = {
  users: 'Thành viên', user: 'Thành viên', members: 'Thành viên',
  threads: 'Chủ đề', thread: 'Chủ đề', posts: 'Bài viết', post: 'Bài viết',
  comments: 'Bình luận', online: 'Đang online', total: 'Tổng', today: 'Hôm nay',
  week: 'Tuần', month: 'Tháng', new: 'Mới', pending: 'Chờ duyệt', revenue: 'Doanh thu',
  orders: 'Đơn hàng', products: 'Sản phẩm', reports: 'Báo cáo', gem: 'Gem', coin: 'Coin',
};
const humanize = (k: string) => LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const QUICK = [
  { href: '/admin/forum-categories', label: 'Danh mục diễn đàn', icon: FolderTree },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
  { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
  { href: '/admin/marketplace', label: 'Quản lý Chợ', icon: Store },
  { href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

function flatten(stats: any): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [group, val] of Object.entries(stats || {})) {
    if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val as any)) {
        if (v !== null && typeof v !== 'object') out.push({ label: `${humanize(group)} · ${humanize(k)}`, value: String(v) });
      }
    } else if (val !== null) {
      out.push({ label: humanize(group), value: String(val) });
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
      <div>
        <h1 className="text-2xl font-bold">Bảng điều khiển</h1>
        <p className="text-sm text-ink-500">Tổng quan hệ thống và lối tắt tới các khu quản trị.</p>
      </div>

      {err && <div className="card p-4 text-sm text-ink-500">Không tải được thống kê: {err}</div>}

      {cards.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Thống kê</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-ink-200/70 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="mt-0.5 text-xs text-ink-500">{c.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href}
              className="group flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white p-4 transition hover:border-brand-400 hover:shadow-sm dark:border-ink-800 dark:bg-ink-900">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-ink-800"><q.icon size={20} /></span>
              <span className="flex-1 text-sm font-medium">{q.label}</span>
              <ChevronRight size={16} className="text-ink-300 group-hover:text-brand-500" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
