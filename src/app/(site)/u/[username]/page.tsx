import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import {
  Calendar, Images,
  MessageSquare, Activity as ActivityIcon, BookOpen,
} from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { ActivityFeed } from '@/components/user/ActivityFeed';
import { getUserActivity } from '@/lib/activity';
import { authorChipSelect, toAuthorChip } from '@/lib/shop';
import { threadExcerpt } from '@/lib/bbcode';
import { Pagination } from '@/components/Pagination';
import { FollowButton } from '@/components/user/FollowButton';
import { cn, fmtCount } from '@/lib/utils';
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
import { PixelIcon } from '@/components/PixelIcon';
import { checkKarmaPermission } from '@/lib/karma';
import { karmaSigned, karmaTone } from '@/lib/karma-const';

export const dynamic = 'force-dynamic';
/**
 * Số chủ đề mỗi trang ở tab "Chủ đề".
 *
 * Chín là con số còn sót từ hồi khối này là lưới ba cột (ba hàng cho chẵn).
 * Nay là bảng dọc nên lấy tròn mười, bằng với các bảng chủ đề khác của trang.
 */
const PAGE_SIZE = 10;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username }, select: { name: true, username: true, bio: true } });
  return u ? { title: `${u.name ?? u.username}`, description: u.bio ?? undefined } : { title: 'Không tìm thấy người dùng' };
}

/**
 * Các tab của trang cá nhân.
 *
 * Tab đầu là mặc định và KHÔNG mang tham số trên URL, để `/u/ten` vẫn là đường
 * dẫn gọn nhất tới hồ sơ một người.
 */
const PROFILE_TABS = [
  { key: 'hoat-dong', label: 'Hoạt động', icon: ActivityIcon },
  { key: 'chu-de', label: 'Chủ đề', icon: MessageSquare },
  { key: 'luu-but', label: 'Sổ lưu bút', icon: BookOpen },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]['key'];

function isProfileTab(v: string | undefined): v is ProfileTab {
  return PROFILE_TABS.some((t) => t.key === v);
}

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string; gb?: string; hd?: string; tab?: string }>;
}) {
  const { username } = await params;
  const { page: pageRaw, gb: gbRaw, hd: hdRaw, tab: tabRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const gbPage = Math.max(1, parseInt(gbRaw ?? '1', 10) || 1);
  const hdPage = Math.max(1, parseInt(hdRaw ?? '1', 10) || 1);
  const tab: ProfileTab = isProfileTab(tabRaw) ? tabRaw : 'hoat-dong';

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true, name: true, username: true, image: true, cover: true, bio: true, mood: true, level: true, role: true,
      points: true, karma: true, createdAt: true,
      profileCover: { select: { value: true } },
      _count: { select: { threads: true, replies: true, followers: true, following: true } },
      ...cosmeticSelect,
      medals: { where: { displayed: true }, take: 8, include: { medal: { select: { name: true, icon: true, color: true } } } },
    },
  });
  if (!user) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const viewer = { id: viewerId, role: (session?.user as { role?: string } | undefined)?.role };

  const where = { authorId: user.id, status: 'PUBLISHED' as const };

  // Mỗi phần nay là một tab, nên CHỈ hỏi cơ sở dữ liệu phần đang mở. Trước đây
  // một lượt xem hồ sơ kéo cả dòng hoạt động, cả danh sách chủ đề, cả sổ lưu
  // bút — hai phần ba trong số đó cuộn qua chẳng ai đọc.
  const [total, following, blocked, friendState, friendCount, albumCount, karmaPerm] = await Promise.all([
    db.thread.count({ where }),
    viewerId ? db.follow.findFirst({ where: { followerId: viewerId, followingId: user.id }, select: { id: true } }) : Promise.resolve(null),
    viewerId ? hasBlocked(viewerId, user.id) : Promise.resolve(false),
    getFriendState(viewerId, user.id),
    countFriends(user.id),
    countVisibleAlbums(user.id, viewer),
    checkKarmaPermission(viewerId, user.id),
  ]);

  const threads = tab === 'chu-de'
    ? await db.thread.findMany({
        where,
        orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        include: { author: { select: authorChipSelect }, forum: { select: { slug: true, name: true } } },
      })
    : [];

  const activity = tab === 'hoat-dong'
    ? await getUserActivity({ id: user.id, username: user.username }, viewer, { page: hdPage })
    : null;

  // Sổ lưu bút: người đã chặn nhau thì không mở sổ cho nhau, khỏi hỏi luôn.
  const guestbook = tab === 'luu-but' && !blocked
    ? await getGuestbook(user.id, viewer, gbPage)
    : null;
  // Quản trị viên không chặn được — che nút cho khỏi bấm rồi mới báo lỗi.
  const canBlock = user.role !== 'ADMIN' && user.role !== 'MODERATOR';
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rows: ThreadRowData[] = threads.map((t) => ({
    id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
    pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
    viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author),
    forum: t.forum, excerpt: threadExcerpt(t.content),
  }));
  const name = user.name ?? user.username ?? 'Ẩn danh';
  const levelLook = await getLevelLook(user.level);
  const cos = toCosmetics(user);
  /**
   * Ảnh bìa: món mua ở cửa hàng được ưu tiên hơn ảnh tự tải lên.
   *
   * Ai bỏ điểm ra mua thì muốn thấy nó ngay, chứ không phải đi gỡ ảnh cũ trong
   * cài đặt rồi mới thấy món vừa mua. Gỡ món ra là ảnh tự tải lên hiện lại.
   */
  const coverImage = user.profileCover?.value ?? user.cover;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Card hồ sơ */}
      <section className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-500 to-brand-400 sm:h-36"
          style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
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
              <span className="flex items-center gap-1.5"><PixelIcon name="chuDe" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.threads)}</b> chủ đề</span>
              <span className="flex items-center gap-1.5"><PixelIcon name="thanhVien" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.followers)}</b> người theo dõi</span>
              <span className="flex items-center gap-1.5"><PixelIcon name="theoDoi" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user._count.following)}</b> đang theo dõi</span>
              <span className="flex items-center gap-1.5"><PixelIcon name="banBe" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(friendCount)}</b> bạn bè</span>
              <Link href={`/u/${username}/album`} className="flex items-center gap-1.5 hover:text-brand-600">
                <PixelIcon name="album" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(albumCount)}</b> album ảnh
              </Link>
              <span className="flex items-center gap-1.5"><PixelIcon name="diem" /> <b className="text-ink-700 dark:text-ink-200">{fmtCount(user.points)}</b> điểm</span>
              <Link href={`/u/${username}/uy-tin`} className="flex items-center gap-1.5 hover:text-brand-600">
                <PixelIcon name="uyTin" /> <b className={karmaTone(user.karma)}>{karmaSigned(user.karma)}</b> uy tín
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

      {/* Mỗi phần một tab thay vì đổ dọc hết xuống: hồ sơ của người hoạt động
          nhiều thì cuộn mãi không hết, mà ba phần chẳng liên quan gì nhau. */}
      <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-ink-800">
        {PROFILE_TABS.map((t) => (
          <Link key={t.key} href={t.key === 'hoat-dong' ? `/u/${username}` : `/u/${username}?tab=${t.key}`}
            className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
            <t.icon size={15} /> {t.label}
            {t.key === 'chu-de' && <span className={cn('text-xs', tab === t.key ? 'text-brand-400' : 'text-ink-400')}>{fmtCount(total)}</span>}
          </Link>
        ))}
        {albumCount > 0 && (
          <Link href={`/u/${username}/album`}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600">
            <Images size={15} /> Album ảnh
            <span className="text-xs text-ink-400">{fmtCount(albumCount)}</span>
          </Link>
        )}
      </nav>

      <div className="mt-4">
        {tab === 'hoat-dong' && activity && (
          <>
            <ActivityFeed items={activity.items} name={name} />
            <Pagination page={activity.page} totalPages={activity.totalPages}
              basePath={`/u/${username}?tab=hoat-dong`} pageParam="hd" />
          </>
        )}

        {tab === 'chu-de' && (
          <>
            {rows.length === 0 ? (
              <div className="card p-8 text-center text-sm text-ink-500">Người này chưa lập chủ đề nào.</div>
            ) : (
              <div className="card divide-y divide-ink-100 dark:divide-ink-800">
                {rows.map((t) => <ThreadRow key={t.id} thread={t} forumSlug={t.forum?.slug ?? ''} />)}
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} basePath={`/u/${username}?tab=chu-de`} />
          </>
        )}

        {tab === 'luu-but' && (
          blocked ? (
            <div className="card p-8 text-center text-sm text-ink-500">
              Hai người đang chặn nhau nên sổ lưu bút không mở.
            </div>
          ) : guestbook && (
            <Guestbook
              username={username} ownerName={name}
              items={guestbook.items} total={guestbook.total} page={gbPage} totalPages={guestbook.totalPages}
              viewerId={viewerId} isOwner={viewerId === user.id} staff={isStaff(viewer)} loggedIn={!!viewerId}
            />
          )
        )}
      </div>
    </div>
  );
}
