import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtCount, fmtVnd } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { UserRowActions } from '@/components/admin/UserRowActions';

export const metadata: Metadata = { title: 'Người dùng' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  MODERATOR: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  AUTHOR: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await auth();
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = myRole === 'ADMIN';

  const { page: pageRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const q = (qRaw ?? '').trim();
  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { username: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
    : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, username: true, email: true, image: true, role: true, status: true, points: true, balance: true, createdAt: true },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const base = q ? `/admin/users?q=${encodeURIComponent(q)}` : '/admin/users';

  // Lệnh cấm còn hiệu lực của những người đang hiển thị (hết hạn thì bỏ qua).
  const now = new Date();
  const bans = users.length
    ? await db.ban.findMany({
        where: {
          userId: { in: users.map((u) => u.id) },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, scope: true, reason: true, expiresAt: true },
      })
    : [];
  const bansOf = (userId: string) =>
    bans.filter((b) => b.userId === userId)
      .map((b) => ({ scope: b.scope, reason: b.reason, expiresAt: b.expiresAt?.toISOString() ?? null }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Quản lý người dùng</h1>
        <span className="text-sm text-ink-500">{fmtCount(total)} thành viên</span>
      </div>

      <form action="/admin/users" className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input name="q" defaultValue={q} placeholder="Tìm theo tên, username hoặc email…"
          className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-900" />
      </form>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {users.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Không tìm thấy người dùng.</div>}
        {users.map((u) => {
          const banned = u.status === 'BANNED';
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u.image
                ? <img src={u.image} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link href={`/u/${u.username}`} target="_blank" className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white">{u.name ?? u.username ?? 'Ẩn danh'}</Link>
                  {u.role !== 'USER' && <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', ROLE_BADGE[u.role])}>{u.role}</span>}
                  {banned && <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-500">Đã khoá</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                  <span className="truncate">{u.email ?? `@${u.username}`}</span>
                  <span>·</span>
                  <span>{fmtCount(u.points)} điểm</span>
                  <span>·</span>
                  <span>{fmtVnd(u.balance)}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{format(u.createdAt, 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <UserRowActions id={u.id} username={u.username ?? ''} role={u.role} banned={banned}
                bans={bansOf(u.id)} canManageRole={isSuperAdmin} isAdmin={u.role === 'ADMIN'} />
            </div>
          );
        })}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={base} />}
    </div>
  );
}
