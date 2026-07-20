import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Calendar, Coins, FileText, Users, UserPlus as FollowIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { FollowButton } from '@/components/post/FollowButton';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 9;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username }, select: { name: true, username: true, bio: true } });
  return u ? { title: `${u.name ?? u.username}`, description: u.bio ?? undefined } : { title: 'Không tìm thấy người dùng' };
}

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ username: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true, name: true, username: true, image: true, cover: true, bio: true, level: true,
      vipTier: true, points: true, createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
      medals: { where: { displayed: true }, take: 8, include: { medal: { select: { name: true, icon: true, color: true } } } },
    },
  });
  if (!user) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const where = { authorId: user.id, status: 'PUBLISHED' as const };
  const [total, posts, following] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({ where, orderBy: [{ publishedAt: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: postCardInclude }),
    viewerId ? db.follow.findFirst({ where: { followerId: viewerId, followingId: user.id }, select: { id: true } }) : Promise.resolve(null),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const name = user.name ?? user.username ?? 'Ẩn danh';

  return (
    <div className="mx-auto max-w-4xl">
      {/* Card hồ sơ */}
      <section className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-500 to-brand-400 sm:h-36"
          style={user.cover ? { backgroundImage: `url(${user.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.image
              ? <img src={user.image} alt="" className="h-24 w-24 rounded-2xl border-4 border-white object-cover dark:border-ink-900" />
              : <span className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-white bg-brand-500 text-3xl font-black text-white dark:border-ink-900">{name[0]?.toUpperCase()}</span>}
            <div className="mb-1">
              <FollowButton targetId={user.id} initialFollowing={!!following} initialCount={user._count.followers} self={viewerId === user.id} />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{name}</h1>
              <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">Lv{user.level}</span>
              {user.vipTier != null && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">VIP{user.vipTier}</span>}
            </div>
            {user.username && <p className="text-sm text-ink-400">@{user.username}</p>}
            {user.bio && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{user.bio}</p>}

            {user.medals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.medals.map((m) => (
                  <span key={m.medalId} title={m.medal.name} className="chip gap-1 bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    <span>{m.medal.icon}</span> {m.medal.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><FileText size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.posts)}</b> bài viết</span>
              <span className="flex items-center gap-1.5"><Users size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.followers)}</b> người theo dõi</span>
              <span className="flex items-center gap-1.5"><FollowIcon size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.following)}</b> đang theo dõi</span>
              <span className="flex items-center gap-1.5"><Coins size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user.points)}</b> điểm</span>
              <span className="flex items-center gap-1.5"><Calendar size={15} /> Tham gia {format(user.createdAt, 'MM/yyyy')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bài viết */}
      <div className="mt-6">
        <h2 className="zib-title mb-4">Bài viết của {name}</h2>
        <PostGrid posts={posts.map(toCardData)} empty="Người này chưa đăng bài viết nào." />
        <Pagination page={page} totalPages={totalPages} basePath={`/u/${username}`} />
      </div>
    </div>
  );
}
