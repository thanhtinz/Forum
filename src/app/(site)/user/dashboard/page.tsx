import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Coins, Wallet, TrendingUp, Flame, PenLine, Crown, User as UserIcon, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount, fmtVnd } from '@/lib/utils';
import { POINTS_REASON_LABEL as REASON_LABEL } from '@/lib/labels';
import { CheckinButton } from '@/components/user/CheckinButton';

export const metadata: Metadata = { title: 'Trang cá nhân' };
export const dynamic = 'force-dynamic';

function vnDateStr(d: Date): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/dashboard');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, username: true, image: true, points: true, balance: true, level: true, exp: true,
      vipTier: true, vipExpiresAt: true, vipPermanent: true, checkinStreak: true, lastCheckinAt: true,
      _count: { select: { posts: true } },
    },
  });
  if (!user) redirect('/login');

  const [pointsLogs, nextLevel] = await Promise.all([
    db.pointsLog.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 8 }),
    db.levelRule.findFirst({ where: { level: user.level + 1 }, select: { expRequired: true } }),
  ]);

  const name = user.name ?? user.username ?? 'Bạn';
  const checkedInToday = !!user.lastCheckinAt && vnDateStr(user.lastCheckinAt) === vnDateStr(new Date());
  const expProgress = nextLevel?.expRequired ? Math.min(100, Math.round((user.exp / nextLevel.expRequired) * 100)) : 100;
  const vipActive = user.vipTier != null && (user.vipPermanent || !user.vipExpiresAt || user.vipExpiresAt > new Date());

  return (
    <div className="mx-auto max-w-4xl">
      {/* Chào + điểm danh */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.image
            ? <img src={user.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-xl font-black text-white">{name[0]?.toUpperCase()}</span>}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Xin chào, {name}</h1>
              <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50">Lv{user.level}</span>
              {vipActive && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/50">VIP{user.vipTier}</span>}
            </div>
            <Link href={`/u/${user.username ?? ''}`} className="text-sm text-brand-600 hover:underline">Xem trang cá nhân</Link>
          </div>
        </div>
        <CheckinButton checkedInToday={checkedInToday} streak={user.checkinStreak} />
      </section>

      {/* Thẻ số liệu */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Coins size={18} />} color="text-amber-500" label="Điểm" value={fmtCount(user.points)} href="/user/points" />
        <StatCard icon={<Wallet size={18} />} color="text-green-500" label="Số dư" value={fmtVnd(user.balance)} href="/user/balance" />
        <StatCard icon={<TrendingUp size={18} />} color="text-brand-500" label={`Cấp ${user.level}`}
          value={nextLevel ? `${user.exp}/${nextLevel.expRequired} EXP` : `${user.exp} EXP`} progress={expProgress} />
        <StatCard icon={<Flame size={18} />} color="text-red-500" label="Chuỗi điểm danh" value={`${user.checkinStreak} ngày`} />
      </div>

      {/* Lối tắt */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/user/write" icon={<PenLine size={18} />} label="Đăng bài" primary />
        <QuickLink href="/vip" icon={<Crown size={18} />} label="Nâng cấp VIP" />
        <QuickLink href="/user/balance" icon={<Plus size={18} />} label="Nạp tiền" />
        <QuickLink href={`/u/${user.username ?? ''}`} icon={<UserIcon size={18} />} label="Trang cá nhân" />
      </div>

      {/* Lịch sử điểm */}
      <section className="card mt-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Biến động điểm gần đây</h2>
          <Link href="/user/points" className="text-sm text-brand-600 hover:underline">Xem tất cả</Link>
        </div>
        {pointsLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">Chưa có biến động điểm nào.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {pointsLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${l.amount >= 0 ? 'bg-green-50 text-green-600 dark:bg-green-950/40' : 'bg-red-50 text-red-600 dark:bg-red-950/40'}`}>
                    {l.amount >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{REASON_LABEL[l.reason] ?? l.reason}</p>
                    <p className="truncate text-xs text-ink-400">{l.note ?? format(l.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-bold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {l.amount >= 0 ? '+' : ''}{fmtCount(l.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, color, label, value, href, progress }: {
  icon: React.ReactNode; color: string; label: string; value: string; href?: string; progress?: number;
}) {
  const inner = (
    <div className="card h-full p-4">
      <div className={`flex items-center gap-1.5 text-sm text-ink-500 ${color}`}>{icon}<span className="text-ink-500">{label}</span></div>
      <div className="mt-1.5 text-lg font-bold">{value}</div>
      {progress != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="transition-transform hover:-translate-y-0.5">{inner}</Link> : inner;
}

function QuickLink({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link href={href}
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${primary ? 'bg-brand-500 text-white hover:bg-brand-600' : 'card hover:border-brand-400'}`}>
      {icon} {label}
    </Link>
  );
}
