import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Bell, Coins, Wallet, TrendingUp, Flame, PenLine, Bookmark, Gift, Banknote, Users, Plus, Settings, FileText, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount } from '@/lib/utils';
import { POINTS_REASON_LABEL as REASON_LABEL } from '@/lib/labels';
import { CheckinButton } from '@/components/user/CheckinButton';
import { getLevelLook } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';

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
      name: true, username: true, image: true, points: true, level: true, exp: true,
      checkinStreak: true, lastCheckinAt: true,
    },
  });
  if (!user) redirect('/login');

  const [pointsLogs, nextLevel] = await Promise.all([
    db.pointsLog.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 8 }),
    db.levelRule.findFirst({ where: { level: user.level + 1 }, select: { expRequired: true } }),
  ]);
  const levelLook = await getLevelLook(user.level);

  const name = user.name ?? user.username ?? 'Bạn';
  const checkedInToday = !!user.lastCheckinAt && vnDateStr(user.lastCheckinAt) === vnDateStr(new Date());
  const expProgress = nextLevel?.expRequired ? Math.min(100, Math.round((user.exp / nextLevel.expRequired) * 100)) : 100;

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
              <LevelBadge level={user.level} color={levelLook?.color} name={levelLook?.name} />
            </div>
            <Link href={`/u/${user.username ?? ''}`} className="text-sm text-brand-600 hover:underline">Xem trang cá nhân</Link>
          </div>
        </div>
        <CheckinButton checkedInToday={checkedInToday} streak={user.checkinStreak} />
      </section>

      {/* Thẻ số liệu */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Coins size={18} />} color="text-amber-500" label="Điểm" value={fmtCount(user.points)} href="/user/points" />
        <StatCard icon={<TrendingUp size={18} />} color="text-brand-500" label={`Cấp ${user.level}`}
          value={nextLevel ? `${user.exp}/${nextLevel.expRequired} EXP` : `${user.exp} EXP`} progress={expProgress} />
        <StatCard icon={<Flame size={18} />} color="text-red-500" label="Chuỗi điểm danh" value={`${user.checkinStreak} ngày`} />
      </div>

      {/* Lối tắt */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/dang-chu-de" icon={<PenLine size={18} />} label="Đăng chủ đề" primary />
        <QuickLink href="/chua-doc" icon={<Sparkles size={18} />} label="Chưa đọc" />
        <QuickLink href={`/u/${user.username ?? ''}`} icon={<FileText size={18} />} label="Chủ đề của tôi" />
        <QuickLink href="/user/following" icon={<Users size={18} />} label="Đang theo dõi" />
        <QuickLink href="/user/threads" icon={<Bell size={18} />} label="Chủ đề theo dõi" />
        <QuickLink href="/user/favorites" icon={<Bookmark size={18} />} label="Đã lưu" />
        <QuickLink href="/user/invite" icon={<Gift size={18} />} label="Mời bạn" />
        <QuickLink href="/user/settings" icon={<Settings size={18} />} label="Cài đặt" />
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
                {/* `min-w-0` phải có ở ĐÂY nữa, không chỉ ở thẻ con: thiếu nó
                    thì mục flex này không co được, dòng ghi chú dài đẩy cả
                    hàng rộng ra và số điểm bị hất khỏi mép phải màn hình. */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
