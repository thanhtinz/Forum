import Link from 'next/link';
import { Flame, Users, Trophy } from 'lucide-react';
import { db } from '@/lib/db';
import { ONLINE_WINDOW_MS } from '@/lib/members';
import { fmtCount, fmtAgo } from '@/lib/utils';
import { getLevelLooks } from '@/lib/level';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { cosmeticSelect, toCosmetics } from '@/lib/shop';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';

/** Coi là đang online nếu hoạt động trong 15 phút gần đây. */

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
      select: { username: true, name: true, image: true, level: true, ...cosmeticSelect },
    }),
    // Cột sôi nổi hiện cho MỌI khách như nhau, không phân biệt người xem —
    // nên loại thẳng khu vực đặt huy hiệu bắt buộc ra, cùng lý do với bảng
    // tin toàn trang: không có chỗ nào để hỏi "người này có huy hiệu chưa"
    // trong một câu truy vấn dùng chung cho tất cả.
    db.thread.findMany({
      where: { status: 'PUBLISHED', forum: { requiredMedalId: null } },
      orderBy: [{ replyCount: 'desc' }, { viewCount: 'desc' }],
      take: 5,
      select: { id: true, title: true, replyCount: true, forum: { select: { slug: true } } },
    }),
    db.user.findMany({
      orderBy: { exp: 'desc' },
      take: 5,
      select: { username: true, name: true, image: true, level: true, exp: true, role: true, ...cosmeticSelect },
    }),
  ]);

  return (
    <aside className="space-y-4">
      {/* Cộng đồng: gộp thành viên + đang online vào một khối */}
      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Users size={15} className="text-emerald-500" /> Cộng đồng
          {/* Con số này là lối vào tự nhiên nhất của trang "đang online" —
              ai tò mò "ai đang ở đây" thì nhìn đúng vào chỗ ấy trước. */}
          <Link href="/online"
            className="chip ml-auto bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60">
            {online.length} online
          </Link>
        </h3>

        {online.length === 0 ? (
          <p className="text-sm text-ink-400">Chưa có ai hoạt động trong 15 phút qua.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {online.map((u) => (
              <Link key={u.username} href={`/u/${u.username ?? ''}`} title={`${u.name ?? u.username} · Lv${u.level}`}>
                <Avatar image={u.image} name={u.name ?? u.username} cosmetics={toCosmetics(u)} size={36} online />
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
      <GopTrenDienThoai tieuDe="Chủ đề sôi nổi" icon={<Flame size={15} className="text-accent-500" />} lopTieuDe="text-sm font-bold" className="card p-4">
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
      </GopTrenDienThoai>

      {/* Thành viên tích cực */}
      <GopTrenDienThoai tieuDe="Thành viên tích cực" icon={<Trophy size={15} className="text-amber-500" />} lopTieuDe="text-sm font-bold" className="card p-4">
        <div className="mb-2 flex justify-end">
          <Link href="/ranking" className="text-xs text-brand-600 hover:underline">Xếp hạng</Link>
        </div>
        <ol className="space-y-2">
          {topUsers.map((u, i) => (
            <li key={u.username} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-center text-xs font-bold text-ink-400">{i + 1}</span>
              <Avatar image={u.image} name={u.name ?? u.username} cosmetics={toCosmetics(u)} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <UserName username={u.username} name={u.name} role={u.role}
                  level={u.level} look={levelLooks.get(u.level)}
                  cosmetics={toCosmetics(u)} className="!font-medium" />
              </span>
            </li>
          ))}
          {topUsers.length === 0 && <li className="text-sm text-ink-400">Chưa có thành viên.</li>}
        </ol>
      </GopTrenDienThoai>
    </aside>
  );
}
