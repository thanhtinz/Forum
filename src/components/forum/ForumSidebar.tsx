import Link from 'next/link';
import { Flame, Users, Trophy, Circle } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount, fmtAgo } from '@/lib/utils';
import { getLevelLooks } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';

/** Coi là đang online nếu hoạt động trong 15 phút gần đây. */
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export async function ForumSidebar() {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  const levelLooks = await getLevelLooks();
  const [userCount, newestUser, online, hotThreads, topUsers] = await Promise.all([
    db.user.count(),
    db.user.findFirst({ orderBy: { createdAt: 'desc' }, select: { username: true, name: true, createdAt: true } }),
    db.user.findMany({
      where: { lastSeenAt: { gte: since } },
      orderBy: { lastSeenAt: 'desc' },
      take: 14,
      select: { username: true, name: true, image: true, level: true },
    }),
    db.thread.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ replyCount: 'desc' }, { viewCount: 'desc' }],
      take: 5,
      select: { id: true, title: true, replyCount: true, forum: { select: { slug: true } } },
    }),
    db.user.findMany({
      orderBy: { exp: 'desc' },
      take: 5,
      select: { username: true, name: true, image: true, level: true, exp: true },
    }),
  ]);

  return (
    <aside className="space-y-4">
      {/* Cộng đồng: gộp thành viên + đang online vào một khối */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Users size={15} className="text-emerald-500" /> Cộng đồng
          <span className="chip ml-auto bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">{online.length} online</span>
        </h3>

        {online.length === 0 ? (
          <p className="text-sm text-ink-400">Chưa có ai hoạt động trong 15 phút qua.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {online.map((u) => (
              <Link key={u.username} href={`/u/${u.username ?? ''}`} title={`${u.name ?? u.username} · Lv${u.level}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.image
                  ? <img src={u.image} alt="" className="size-9 rounded-full object-cover" />
                  : <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
                <Circle size={9} className="absolute -bottom-0.5 -right-0.5 fill-emerald-500 text-white dark:text-ink-900" />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-400 dark:border-ink-800">
          <p>Tổng thành viên: <b className="text-ink-700 dark:text-ink-100">{fmtCount(userCount)}</b></p>
          {newestUser && (
            <p>
              Mới nhất:{' '}
              <Link href={`/u/${newestUser.username ?? ''}`} className="font-medium text-brand-600 hover:underline">
                {newestUser.name ?? newestUser.username}
              </Link>{' '}
              · {fmtAgo(newestUser.createdAt)}
            </p>
          )}
        </div>
      </section>

      {/* Chủ đề sôi nổi */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Flame size={15} className="text-accent-500" /> Chủ đề sôi nổi</h3>
        <ol className="space-y-2.5">
          {hotThreads.map((t, i) => (
            <li key={t.id} className="flex gap-2 text-sm">
              <span className={`grid size-5 shrink-0 place-items-center rounded text-[11px] font-bold ${i < 3 ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{i + 1}</span>
              <Link href={`/forum/${t.forum.slug}/${t.id}`} className="line-clamp-2 flex-1 text-ink-700 hover:text-brand-600 dark:text-ink-200">{t.title}</Link>
              <span className="shrink-0 text-xs text-ink-400">{fmtCount(t.replyCount)}</span>
            </li>
          ))}
          {hotThreads.length === 0 && <li className="text-sm text-ink-400">Chưa có chủ đề nào.</li>}
        </ol>
      </section>

      {/* Thành viên tích cực */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Trophy size={15} className="text-amber-500" /> Thành viên tích cực</h3>
        <ol className="space-y-2">
          {topUsers.map((u, i) => (
            <li key={u.username} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-center text-xs font-bold text-ink-400">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u.image
                ? <img src={u.image} alt="" className="size-8 rounded-full object-cover" />
                : <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
              <Link href={`/u/${u.username ?? ''}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-600">{u.name ?? u.username}</Link>
              <LevelBadge level={u.level} icon={levelLooks.get(u.level)?.icon}
                color={levelLooks.get(u.level)?.color} name={levelLooks.get(u.level)?.name} />
            </li>
          ))}
          {topUsers.length === 0 && <li className="text-sm text-ink-400">Chưa có thành viên.</li>}
        </ol>
      </section>
    </aside>
  );
}
