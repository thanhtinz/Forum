import Link from 'next/link';
import type { Metadata } from 'next';
import { Radio, MessageSquare, MessagesSquare, ShieldCheck } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { LevelBadge } from '@/components/LevelBadge';
import { getLevelLooks } from '@/lib/level';
import { getOnline, isOnlineTab, ONLINE_TABS, type OnlineTab, type OnlineSpot } from '@/lib/online';
import { cn, fmtAgo, fmtCount } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Đang online',
  description: 'Ai đang có mặt trên diễn đàn ngay lúc này, và họ đang xem gì.',
};
export const dynamic = 'force-dynamic';

/** Một dòng "đang ở đâu". Không biết thì trả về null để chỗ gọi bỏ hẳn dòng. */
function Spot({ spot }: { spot: OnlineSpot }) {
  if (!spot) return null;
  if (spot.kind === 'chat') {
    return (
      <Link href="/#chat" className="inline-flex items-center gap-1 text-ink-500 hover:text-brand-600">
        <MessageSquare size={12} /> Đang ở phòng chat
      </Link>
    );
  }
  return (
    <Link href={`/forum/${spot.forumSlug}/${spot.id}`}
      className="inline-flex min-w-0 items-center gap-1 text-ink-500 hover:text-brand-600">
      <MessagesSquare size={12} className="shrink-0" />
      <span className="truncate">Đang xem: {spot.title}</span>
    </Link>
  );
}

export default async function OnlinePage({ searchParams }: {
  searchParams: Promise<{ page?: string; loc?: string }>;
}) {
  const { page: pageRaw, loc } = await searchParams;
  const tab: OnlineTab = isOnlineTab(loc) ? loc : 'tat-ca';
  const [list, levelLooks] = await Promise.all([
    getOnline(tab, Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)),
    getLevelLooks(),
  ]);

  const duong = (t: OnlineTab) => (t === 'tat-ca' ? '/online' : `/online?loc=${t}`);

  return (
    <div className="container-nova py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-ink-800 dark:text-ink-100">
            <Radio size={24} className="text-emerald-500" /> Đang online
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            <span className="text-emerald-600 dark:text-emerald-400">{fmtCount(list.total)} thành viên</span> có mặt
            trong 15 phút qua.
          </p>
        </div>

        <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-ink-800">
          {ONLINE_TABS.map((t) => (
            <Link key={t.key} href={duong(t.key)}
              className={cn('shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
              {t.label}
            </Link>
          ))}
        </div>
      </header>

      <section className="card overflow-hidden" data-online>
        {list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-ink-400">
            <Radio size={28} />
            <p>{tab === 'dieu-hanh' ? 'Ban điều hành đang vắng mặt.' : 'Chưa có ai online lúc này.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {list.items.map((u) => {
              const name = u.chip?.name ?? u.chip?.username ?? 'Ẩn danh';
              const staff = u.role === 'ADMIN' || u.role === 'MODERATOR';
              const look = levelLooks.get(u.chip?.level ?? 1);
              return (
                <li key={u.id} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
                  <Link href={`/u/${u.chip?.username ?? ''}`} className="relative shrink-0 self-start" aria-label={name}>
                    <Avatar image={u.chip?.image ?? null} name={name} cosmetics={u.chip?.cosmetics} size={40} />
                    {/* Dấu online là một chấm tròn chứ không phải icon: ở góc
                        avatar, cỡ chừng này thì mọi icon đều thành vệt mờ. */}
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900"
                      aria-label="Đang online" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      {/* Không truyền `level` cho UserName: huy hiệu cấp có màu
                          ngay bên cạnh rồi, truyền cả hai thì cấp hiện hai lần. */}
                      <UserName username={u.chip?.username ?? null} name={u.chip?.name ?? null} role={u.chip?.role}
                        cosmetics={u.chip?.cosmetics} className="font-bold" />
                      <LevelBadge level={u.chip?.level ?? 1} icon={look?.icon} color={look?.color} name={look?.name} />
                      {staff && (
                        <span className="chip gap-1 bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                          <ShieldCheck size={11} /> {u.role === 'ADMIN' ? 'Quản trị' : 'Điều hành'}
                        </span>
                      )}
                    </div>
                    {u.mood && <p className="mt-0.5 truncate text-xs italic text-ink-400">“{u.mood}”</p>}
                    <p className="mt-0.5 min-w-0 truncate text-xs"><Spot spot={u.spot} /></p>
                  </div>

                  <span className="retro-sub shrink-0 self-start text-ink-400">{fmtAgo(u.lastSeenAt ?? new Date())}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-4"><Pagination page={list.page} totalPages={list.totalPages} basePath={duong(tab)} /></div>
    </div>
  );
}
