import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { authorChipSelect, toAuthorChip } from '@/lib/shop';
import { threadExcerpt } from '@/lib/bbcode';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Chủ đề từ người bạn theo dõi' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;
/** Hàng avatar ở đầu trang chỉ khoe ngần này người. */
const AVATARS_SHOWN = 20;

export default async function FollowingFeedPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/following');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  // Lọc chủ đề bằng quan hệ chứ không kéo danh sách người đang theo dõi về rồi
  // nhét vào `in:` — người theo dõi vài nghìn người sẽ dựng ra một câu truy vấn
  // dài vài nghìn id, và số đó chỉ có tăng.
  const where = {
    status: 'PUBLISHED' as const,
    author: { followers: { some: { followerId: userId } } },
  };

  const [followCount, authors, total, threads] = await Promise.all([
    db.follow.count({ where: { followerId: userId } }),
    // Hàng avatar chỉ khoe vài người đầu, không phải cả danh sách.
    db.user.findMany({
      where: { followers: { some: { followerId: userId } } },
      select: { username: true, name: true, image: true },
      take: AVATARS_SHOWN,
    }),
    db.thread.count({ where }),
    db.thread.findMany({
      where, orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { author: { select: authorChipSelect }, forum: { select: { slug: true, name: true } } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rows: ThreadRowData[] = threads.map((t) => ({
    id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
    pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
    viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author),
    forum: t.forum, excerpt: threadExcerpt(t.content),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex items-center gap-2">
        <Users size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Đang theo dõi</h1>
        <span className="text-sm text-ink-500">({followCount} người)</span>
      </div>

      {authors.length > 0 && (
        <div className="card mb-4 flex flex-wrap gap-3 p-4">
          {authors.map((a) => (
            <Link key={a.username} href={`/u/${a.username}`} className="flex items-center gap-2 rounded-full bg-ink-50 py-1 pl-1 pr-3 hover:bg-ink-100 dark:bg-ink-800/50 dark:hover:bg-ink-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.image
                ? <img src={a.image} alt="" className="size-7 rounded-full object-cover" />
                : <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{(a.name ?? a.username ?? 'U')[0]?.toUpperCase()}</span>}
              <span className="text-sm font-medium">{a.name ?? a.username}</span>
            </Link>
          ))}
        </div>
      )}

      {followCount === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-ink-400">
          <UserPlus size={30} />
          <p>Bạn chưa theo dõi ai. Ghé trang cá nhân của một thành viên và nhấn “Theo dõi” để xem chủ đề mới của họ tại đây.</p>
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-500">Những người bạn theo dõi chưa lập chủ đề nào.</div>
          ) : (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {rows.map((t) => <ThreadRow key={t.id} thread={t} forumSlug={t.forum?.slug ?? ''} />)}
            </div>
          )}
          {totalPages > 1 && <div className="mt-6"><Pagination page={page} totalPages={totalPages} basePath="/user/following" /></div>}
        </>
      )}
    </div>
  );
}
