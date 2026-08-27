import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Calendar, Coins, FileText, Images, Scale, Users, UserCheck, UserPlus as FollowIcon, MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { postCardSelect, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { FollowButton } from '@/components/post/FollowButton';
import { fmtCount } from '@/lib/utils';
import { getLevelLook } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';
import { IconGlyph } from '@/components/IconGlyph';
import { openConversation } from '@/app/(site)/user/messages/actions';
import { BlockButton } from '@/components/user/BlockButton';
import { hasBlocked } from '@/lib/block';
import { getGuestbook, isStaff } from '@/lib/guestbook';
import { countFriends, getFriendState } from '@/lib/friend';
import { countVisibleAlbums } from '@/lib/album';
import { cosmeticSelect, toCosmetics } from '@/lib/shop';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { FriendButton } from '@/components/user/FriendButton';
import { Guestbook } from '@/components/user/Guestbook';
import { KarmaBox } from '@/components/user/KarmaBox';
import { checkKarmaPermission } from '@/lib/karma';
import { karmaSigned, karmaTone } from '@/lib/karma-const';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 9;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username }, select: { name: true, username: true, bio: true } });
  return u ? { title: `${u.name ?? u.username}`, description: u.bio ?? undefined } : { title: 'Không tìm thấy người dùng' };
}

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ username: string }>; searchParams: Promise<{ page?: string; gb?: string }>;
}) {
  const { username } = await params;
  const { page: pageRaw, gb: gbRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const gbPage = Math.max(1, parseInt(gbRaw ?? '1', 10) || 1);

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true, name: true, username: true, image: true, cover: true, bio: true, mood: true, level: true, role: true,
      points: true, karma: true, createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
      ...cosmeticSelect,
      medals: { where: { displayed: true }, take: 8, include: { medal: { select: { name: true, icon: true, color: true } } } },
    },
  });
  if (!user) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const viewer = { id: viewerId, role: (session?.user as { role?: string } | undefined)?.role };

  const where = { authorId: user.id, status: 'PUBLISHED' as const };
  const [total, posts, following, blocked, guestbook, friendState, friendCount, albumCount, karmaPerm] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({ where, orderBy: [{ publishedAt: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: postCardSelect }),
    viewerId ? db.follow.findFirst({ where: { followerId: viewerId, followingId: user.id }, select: { id: true } }) : Promise.resolve(null),
    viewerId ? hasBlocked(viewerId, user.id) : Promise.resolve(false),
    getGuestbook(user.id, viewer, gbPage),
    getFriendState(viewerId, user.id),
    countFriends(user.id),
    countVisibleAlbums(user.id, viewer),
    checkKarmaPermission(viewerId, user.id),
  ]);
  // Quản trị viên không chặn được — che nút cho khỏi bấm rồi mới báo lỗi.
  const canBlock = user.role !== 'ADMIN' && user.role !== 'MODERATOR';
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const name = user.name ?? user.username ?? 'Ẩn danh';
  const levelLook = await getLevelLook(user.level);
  const cos = toCosmetics(user);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Card hồ sơ */}
      <section className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-500 to-brand-400 sm:h-36"
          style={user.cover ? { backgroundImage: `url(${user.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <Avatar image={user.image} name={name} cosmetics={cos} size={96}
              rounded="rounded-2xl border-4 border-white dark:border-ink-900" />
            <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
              {/* Đã chặn thì không còn nhắn tin / theo dõi, chỉ còn nút bỏ chặn */}
              {viewerId && viewerId !== user.id && !blocked && user.username && (
                <form action={openConversation}>
                  <input type="hidden" name="username" value={user.username} />
                  <button type="submit" className="btn-outline !rounded-full gap-1.5 !px-3.5 !py-2 text-sm">
                    <MessageSquare size={15} /> Nhắn tin
                  </button>
                </form>
              )}
              {!blocked && (
                <FollowButton targetId={user.id} initialFollowing={!!following} initialCount={user._count.followers} self={viewerId === user.id} />
              )}
              {!blocked && (
                <FriendButton targetId={user.id} targetName={name} initial={friendState}
                  loggedIn={!!viewerId} callbackUrl={`/u/${username}`} />
              )}
              {viewerId && viewerId !== user.id && canBlock && (
                <BlockButton targetId={user.id} targetName={name} initialBlocked={blocked} />
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">
                <UserName username={user.username} name={user.name} role={user.role}
                  levelColor={levelLook?.color} cosmetics={cos} asLink={false} />
              </h1>
              <LevelBadge level={user.level} icon={levelLook?.icon} color={levelLook?.color} name={levelLook?.name} />
            </div>
            {user.username && <p className="text-sm text-ink-400">@{user.username}</p>}
            {user.mood?.trim() && (
              <p className="mt-1 text-sm italic text-ink-500 dark:text-ink-400">“{user.mood}”</p>
            )}
            {user.bio && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{user.bio}</p>}

            {user.medals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.medals.map((m) => (
                  <span key={m.medalId} title={m.medal.name} className="chip gap-1 bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    <IconGlyph icon={m.medal.icon} className="size-4" /> {m.medal.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><FileText size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.posts)}</b> bài viết</span>
              <span className="flex items-center gap-1.5"><Users size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.followers)}</b> người theo dõi</span>
              <span className="flex items-center gap-1.5"><FollowIcon size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.following)}</b> đang theo dõi</span>
              <span className="flex items-center gap-1.5"><UserCheck size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(friendCount)}</b> bạn bè</span>
              <Link href={`/u/${username}/album`} className="flex items-center gap-1.5 hover:text-brand-600">
                <Images size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(albumCount)}</b> album ảnh
              </Link>
              <span className="flex items-center gap-1.5"><Coins size={15} /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user.points)}</b> điểm</span>
              <Link href={`/u/${username}/uy-tin`} className="flex items-center gap-1.5 hover:text-brand-600">
                <Scale size={15} /> <b className={karmaTone(user.karma)}>{karmaSigned(user.karma)}</b> uy tín
              </Link>
              <span className="flex items-center gap-1.5"><Calendar size={15} /> Tham gia {format(user.createdAt, 'MM/yyyy')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Uy tín — chấm được cho nhau, có sổ công khai. Người đã chặn nhau thì
          không chấm qua lại, nên giấu luôn cả ô. */}
      {!blocked && (
        <div className="mt-4">
          <KarmaBox targetId={user.id} username={username} karma={user.karma}
            canGive={karmaPerm.can}
            /* Ở trang của chính mình thì không cần câu "không tự chấm cho mình
               được" — chẳng ai đang định làm thế cả. */
            blockedReason={karmaPerm.can || viewerId === user.id ? undefined : karmaPerm.reason}
            loggedIn={!!viewerId} callbackUrl={`/u/${username}`} />
        </div>
      )}

      {/* Bài viết */}
      <div className="mt-6">
        <h2 className="zib-title mb-4">Bài viết của {name}</h2>
        <PostGrid posts={posts.map(toCardData)} empty="Người này chưa đăng bài viết nào." />
        <Pagination page={page} totalPages={totalPages} basePath={`/u/${username}`} />
      </div>

      {/* Sổ lưu bút — người đã chặn nhau thì không mở sổ cho nhau xem lẫn ghi. */}
      {!blocked && (
        <Guestbook
          username={username} ownerName={name}
          items={guestbook.items} total={guestbook.total} page={gbPage} totalPages={guestbook.totalPages}
          viewerId={viewerId} isOwner={viewerId === user.id} staff={isStaff(viewer)} loggedIn={!!viewerId}
        />
      )}
    </div>
  );
}
