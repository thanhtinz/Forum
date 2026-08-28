import Link from 'next/link';
import { Flame, Tag as TagIcon, Trophy } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { getLevelLooks } from '@/lib/level';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { cosmeticSelect, toCosmetics } from '@/lib/shop';

export async function HomeSidebar() {
  const levelLooks = await getLevelLooks();
  const [hotThreads, topUsers, tags] = await Promise.all([
    // Chủ đề nhiều lượt xem nhất — trước đây ô này khoe bài viết, mà mục bài
    // viết đã gỡ khỏi trang.
    db.thread.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: { id: true, title: true, viewCount: true, forum: { select: { slug: true } } },
    }),
    db.user.findMany({
      orderBy: { exp: 'desc' },
      take: 6,
      select: { username: true, name: true, image: true, level: true, role: true, ...cosmeticSelect },
    }),
    db.tag.findMany({ take: 20, select: { slug: true, name: true } }),
  ]);

  return (
    <aside className="space-y-4">
      {/* Chủ đề nổi bật */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Flame size={15} className="text-accent-500" /> Chủ đề nổi bật</h3>
        <ol className="space-y-2.5">
          {hotThreads.map((t, i) => (
            <li key={t.id} className="flex gap-2 text-sm">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-bold ${i < 3 ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{i + 1}</span>
              <Link href={`/forum/${t.forum.slug}/${t.id}`} className="line-clamp-2 flex-1 text-ink-700 hover:text-brand-600 dark:text-ink-200">{t.title}</Link>
            </li>
          ))}
          {hotThreads.length === 0 && <li className="text-sm text-ink-400">Chưa có chủ đề.</li>}
        </ol>
      </section>

      {/* Bảng xếp hạng */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Trophy size={15} className="text-amber-500" /> Thành viên tích cực</h3>
        <div className="space-y-2">
          {topUsers.map((u) => (
            <Link key={u.username} href={`/u/${u.username ?? ''}`} className="flex items-center gap-2">
              <Avatar image={u.image} name={u.name ?? u.username} cosmetics={toCosmetics(u)} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <UserName username={u.username} name={u.name} role={u.role}
                  level={u.level} look={levelLooks.get(u.level)}
                  cosmetics={toCosmetics(u)} asLink={false} className="!font-medium" />
              </span>
            </Link>
          ))}
          {topUsers.length === 0 && <p className="text-sm text-ink-400">Chưa có thành viên.</p>}
        </div>
      </section>

      {/* Tag cloud */}
      {tags.length > 0 && (
        <section className="card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><TagIcon size={15} className="text-brand-500" /> Thẻ phổ biến</h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link key={t.slug} href={`/tag/${t.slug}`} className="chip bg-ink-100 text-ink-600 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{t.name}</Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
