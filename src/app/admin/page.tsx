import Link from 'next/link';
import { Users, FileText, Flag, MessagesSquare, Gamepad2 } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [users, replies, clubs, threads, games, openReports] = await Promise.all([
    db.user.count(),
    db.reply.count(),
    db.club.count(),
    db.thread.count(),
    db.game.count(),
    db.report.count({ where: { status: 'OPEN' } }),
  ]);
  return { users, replies, clubs, threads, games, openReports };
}

const CARDS = (s: Awaited<ReturnType<typeof getStats>>) => [
  { label: 'Thành viên', value: fmtCount(s.users), icon: Users, tint: 'text-sky-500', href: '/admin/users' },
  { label: 'Chủ đề', value: fmtCount(s.threads), icon: MessagesSquare, tint: 'text-emerald-500', href: '/admin/threads' },
  { label: 'Trả lời', value: fmtCount(s.replies), icon: FileText, tint: 'text-violet-500', href: '/admin/threads' },
  { label: 'Câu lạc bộ', value: fmtCount(s.clubs), icon: Users, tint: 'text-amber-500', href: '/admin/clubs' },
  { label: 'Game', value: fmtCount(s.games), icon: Gamepad2, tint: 'text-fuchsia-500', href: '/admin/games' },
  { label: 'Báo cáo chờ xử lý', value: fmtCount(s.openReports), icon: Flag, tint: 'text-red-500', href: '/admin/reports' },
];

export default async function AdminDashboard() {
  const s = await getStats();
  const cards = CARDS(s);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bảng điều khiển</h1>
        <p className="text-sm text-ink-500">Tổng quan hoạt động của nền tảng.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const inner = (
            <div className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-glow">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-ink-100 dark:bg-ink-800 ${c.tint}`}><Icon size={20} /></span>
              <div className="min-w-0">
                <div className="text-xl font-bold text-ink-900 dark:text-white">{c.value}</div>
                <div className="truncate text-xs text-ink-500">{c.label}</div>
              </div>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

    </div>
  );
}
