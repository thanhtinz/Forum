import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Pin, Lock, Award, CheckCircle2, Eye, EyeOff, MessageSquare, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtCount, truncate } from '@/lib/utils';
import { ThreadActionBar } from '@/components/forum/ThreadActionBar';
import { PollCard } from '@/components/forum/PollCard';
import { toPollView } from '@/lib/poll';
import { ReplyActions } from '@/components/forum/ReplyActions';
import { ReplyForm } from '@/components/forum/ReplyForm';
import { ThreadModMenu } from '@/components/forum/ThreadModMenu';
import { ThanksBar } from '@/components/forum/ThanksBar';
import { THANKS_NAMES_SHOWN, type ThanksState } from '@/lib/thanks';
import { ThreadOwnerMenu } from '@/components/forum/ThreadOwnerMenu';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { WhoIsHere } from '@/components/forum/WhoIsHere';
import { markHere } from '@/lib/shout';
import { markThreadRead } from '@/lib/thread-read';
import { ThreadPost, displayName } from '@/components/forum/ThreadPost';
import { Pagination } from '@/components/Pagination';
import { ReplyBody } from '@/components/forum/ReplyBody';
import { EditScope } from '@/components/EditScope';
import { canModerateForum } from '@/lib/moderation';
import { getLevelLooks, type LevelLook } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { cosmeticSelect, toCosmetics } from '@/lib/shop';
import { hideRules, quoteBBCode, renderHidden, stripHidden } from '@/lib/bbcode';
import type { HideKind, HideViewer } from '@/lib/hide';
import { HideUnlockButton } from '@/components/forum/HideUnlockButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const thread = await db.thread.findUnique({
    where: { id },
    select: { title: true, content: true, status: true, forum: { select: { slug: true } } },
  });
  // Lọc y hệt thân trang (`notFound()` ở dưới). Thẻ meta được dựng riêng, nên
  // thân trang trả 404 mà chỗ này không lọc thì tiêu đề và trích nội dung của
  // một chủ đề đang chờ duyệt / đã ẩn vẫn nằm trong <head> — chỉ cần xem mã
  // nguồn trang 404 là đọc được thứ mà ban điều hành vừa gỡ xuống.
  return thread && thread.forum.slug === slug && thread.status === 'PUBLISHED'
    // Bỏ phần [hide] trước khi rút mô tả: thẻ meta đi ra ngoài trang, ai cũng
    // đọc được mà không phải trả lời câu nào.
    ? { title: thread.title, description: truncate(stripHidden(thread.content).replace(/<[^>]+>/g, ' '), 160) }
    : { title: 'Không tìm thấy chủ đề' };
}

const authorSelect = {
  select: {
    username: true, name: true, image: true, level: true, createdAt: true, signature: true, mood: true, karma: true,
    _count: { select: { threads: true, replies: true } },
    ...cosmeticSelect,
  },
} as const;

/** Gộp số chủ đề + số trả lời thành "số bài", kèm huy hiệu cấp của người đăng. */
function toAuthor(
  u: {
    username: string | null; name: string | null; image: string | null; level: number;
    createdAt: Date; signature: string | null; mood: string | null; karma: number;
    _count: { threads: number; replies: number };
    nameColor?: { value: string } | null;
    shopBadge?: { value: string; name: string } | null;
  },
  looks: Map<number, LevelLook>,
) {
  const look = looks.get(u.level);
  return {
    ...u,
    postCount: u._count.threads + u._count.replies,
    levelColor: look?.color ?? null,
    levelName: look?.name ?? null,
    cosmetics: toCosmetics(u),
  };
}

const REPLIES_PER_PAGE = 10;
/**
 * Mỗi trả lời chỉ dựng sẵn ngần này phản hồi con.
 *
 * Phản hồi con không có phân trang riêng — chúng nằm lồng trong trả lời cha —
 * nên nếu lấy hết thì một trả lời bị "hội đồng" vài nghìn phản hồi sẽ kéo sập
 * đúng cái trang mà mọi người đang đổ vào xem.
 */
const CHILDREN_SHOWN = 10;
/** Khi người đọc bấm "xem tất cả" cho MỘT trả lời thì mở rộng tới mức này. */
const CHILDREN_EXPANDED = 200;

export default async function ThreadPage({ params, searchParams }: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ p?: string; r?: string; td?: string }>;
}) {
  const { slug, id } = await params;
  const { p: pageRaw, r: expandRaw, td: quoteRaw } = await searchParams;
  /** Id của trả lời đang được mở rộng phần phản hồi con, nếu có. */
  const expandId = expandRaw?.trim() || null;

  const thread = await db.thread.findUnique({
    where: { id },
    include: {
      forum: { select: { slug: true, name: true } },
      author: authorSelect,
      tags: { include: { tag: { select: { slug: true, name: true } } } },
      poll: {
        select: {
          id: true, question: true, multiple: true, closesAt: true, closed: true,
          options: { select: { id: true, text: true, order: true } },
          votes: { select: { optionId: true, userId: true } },
        },
      },
    },
  });
  if (!thread || thread.forum.slug !== slug || thread.status !== 'PUBLISHED') notFound();

  // Đếm lượt xem (không chặn hiển thị nếu lỗi)
  db.thread.update({ where: { id }, data: { viewCount: { increment: 1 } }, select: { id: true } }).catch(() => {});

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const loggedIn = !!userId;
  const callbackUrl = `/forum/${slug}/${id}`;
  const isOwner = userId === thread.authorId;
  const canMarkSolution = isOwner && !thread.solvedReplyId && !thread.locked;

  // Điểm danh "đang xem chủ đề này". Không chờ kết quả — hỏng thì cùng lắm
  // là thiếu một cái tên trong dòng cuối trang, không đáng để chặn cả trang.
  if (userId) markHere(userId, `thread:${id}`).catch(() => {});

  // Ghi mốc "đã đọc chủ đề này" để dấu bài mới ở danh sách tắt đi. Cũng không
  // chờ: hỏng thì cùng lắm chủ đề còn dấu mới thêm một lượt.
  if (userId) markThreadRead(userId, id).catch(() => {});

  const canModerate = await canModerateForum(
    session?.user ? { id: session.user.id, role: (session.user as { role?: string }).role } : null,
    thread.forumId,
  );
  const moveTargets = canModerate
    ? await db.forum.findMany({ take: CONFIG_LIST_CAP,
        where: { id: { not: thread.forumId } },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      })
    : [];

  /**
   * Mồi sẵn ô soạn khi vào bằng liên kết "Trích dẫn" của bài mở đầu.
   *
   * Chỉ nhận đúng một giá trị `md`; tham số lạ thì bỏ qua. Nội dung trích do
   * máy chủ dựng từ bài thật, không lấy gì từ địa chỉ — địa chỉ chỉ nói "có
   * trích hay không".
   */
  const levelLooks = await getLevelLooks();
  const quoteSeed = quoteRaw === 'md'
    ? quoteBBCode(displayName(toAuthor(thread.author, levelLooks)), thread.content)
    : undefined;

  const totalReplies = await db.reply.count({ where: { threadId: id, parentId: null, hidden: false } });
  const totalPages = Math.max(1, Math.ceil(totalReplies / REPLIES_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, parseInt(pageRaw ?? '1', 10) || 1));

  // Người kiểm duyệt thấy cả trả lời đã ẩn (có dấu riêng) để còn hiện lại được.
  const replies = await db.reply.findMany({
    where: { threadId: id, parentId: null, ...(canModerate ? {} : { hidden: false }) },
    orderBy: [{ isSolution: 'desc' }, { createdAt: 'asc' }],
    skip: (page - 1) * REPLIES_PER_PAGE,
    take: REPLIES_PER_PAGE,
    include: {
      author: authorSelect,
      children: {
        where: canModerate ? {} : { hidden: false },
        orderBy: { createdAt: 'asc' },
        // Lấy dư một hàng để biết "còn nữa" mà không phải đếm thêm lần nào.
        take: CHILDREN_EXPANDED + 1,
        include: { author: authorSelect },
      },
      _count: { select: { children: true } },
    },
  });

  /**
   * Cắt danh sách phản hồi con xuống mức đang hiển thị.
   *
   * Cắt ở đây, sau khi đã lấy về, chứ không cắt trong truy vấn: Prisma không
   * cho đặt `take` khác nhau cho từng hàng cha trong cùng một lần lấy.
   */
  const childrenShown = <T,>(r: { id: string; children: T[] }): T[] =>
    r.children.slice(0, r.id === expandId ? CHILDREN_EXPANDED : CHILDREN_SHOWN);

  // Số người theo dõi chủ đề và trạng thái theo dõi của người đang xem
  const [followCount, myFollow, saveCount, mySave] = await Promise.all([
    db.threadFollow.count({ where: { threadId: id } }),
    userId
      ? db.threadFollow.findUnique({ where: { threadId_userId: { threadId: id, userId } }, select: { id: true } })
      : null,
    db.favorite.count({ where: { threadId: id } }),
    userId
      ? db.favorite.findUnique({ where: { userId_threadId: { userId, threadId: id } }, select: { id: true } })
      : null,
  ]);

  // Trạng thái "đã thích" của người dùng hiện tại (chủ đề + mọi trả lời)
  const likedThread = new Set<string>();
  const likedReplies = new Set<string>();
  if (userId) {
    const replyIds = (replies ?? []).flatMap((r) => [r.id, ...childrenShown(r).map((c) => c.id)]);
    const reactions = await db.reaction.findMany({
      where: { userId, type: 'LIKE', OR: [{ threadId: id }, { replyId: { in: replyIds } }] },
      select: { threadId: true, replyId: true },
    });
    for (const rx of reactions) {
      if (rx.threadId) likedThread.add(rx.threadId);
      if (rx.replyId) likedReplies.add(rx.replyId);
    }
  }

  /**
   * Ai được đọc khối `[hide]` của bài mở đầu.
   *
   * Chủ chủ đề và ban điều hành thì đương nhiên. Còn lại xét theo đúng điều
   * kiện người đăng gõ trong mã — trả lời, thích, đủ mốc, đủ cấp, hay trả điểm
   * — chứ không còn mỗi kiểu "trả lời mới xem được" như trước.
   *
   * Mỗi lần hỏi thêm cơ sở dữ liệu đều buộc phải có khối cần tới nó: chủ đề nào
   * cũng đếm trả lời với dò sổ mở khoá thì tốn vô ích, mà tuyệt đại đa số chủ
   * đề chẳng có khối ẩn nào.
   */
  const rules = hideRules(thread.content);
  const needs = (k: HideKind) => rules.some((r) => r.kind === k);
  /** Khối đắt nhất; trả một lần là mở hết mọi khối ẩn của chủ đề. */
  const hidePrice = Math.max(0, ...rules.map((r) => (r.kind === 'POINTS' ? r.n : 0)));

  const [repliedHere, hideUnlock, meLevel] = await Promise.all([
    userId && needs('REPLY')
      ? db.reply.count({ where: { threadId: id, authorId: userId } })
      : 0,
    userId && hidePrice > 0
      ? db.threadHideUnlock.findUnique({
          where: { userId_threadId: { userId, threadId: id } }, select: { id: true },
        })
      : null,
    userId && needs('LEVEL')
      ? db.user.findUnique({ where: { id: userId }, select: { level: true } })
      : null,
  ]);

  const hideViewer: HideViewer = {
    loggedIn,
    liked: likedThread.has(thread.id),
    replied: repliedHere > 0,
    level: meLevel?.level ?? 0,
    paid: !!hideUnlock,
    likeCount: thread.likeCount,
    replyCount: thread.replyCount,
  };
  /** Chủ bài và ban điều hành đọc thẳng, khỏi chấm điều kiện nào. */
  const hideView = isOwner || canModerate ? true : hideViewer;
  /** Còn khoá bằng điểm thì mới mời mua — trả rồi mà vẫn mời là kỳ. */
  const offerHideBuy = hideView !== true && hidePrice > 0 && !hideUnlock;

  // Trạng thái "cảm ơn" của bài mở đầu và mọi trả lời đang hiện.
  //
  // Bảng cảm ơn chỉ khoe vài cái tên rồi gộp phần còn lại thành "và N người
  // khác", nên KHÔNG được lấy hết hàng về rồi mới cắt: một bài được mười nghìn
  // lượt cảm ơn sẽ kéo đủ mười nghìn hàng kèm mười nghìn lần nối bảng người
  // dùng, chỉ để in ra mười hai cái tên.
  //
  // Vì vậy chia làm ba việc, việc nào cũng có trần:
  //   • đếm bằng groupBy — cơ sở dữ liệu đếm, không gửi hàng nào về;
  //   • lấy tên bằng một câu SQL có ROW_NUMBER, chặn đúng ngần ấy tên MỖI bài
  //     (Prisma không đặt được `take` riêng cho từng nhóm);
  //   • hỏi riêng xem chính người đang xem đã cảm ơn bài nào.
  const thankTargets = (replies ?? []).flatMap((r) => [r.id, ...childrenShown(r).map((c) => c.id)]);

  const [thankCounts, thankNames, myThanks] = await Promise.all([
    db.reaction.groupBy({
      by: ['threadId', 'replyId'],
      where: { type: 'THANKS', OR: [{ threadId: id }, { replyId: { in: thankTargets } }] },
      _count: { _all: true },
    }),
    db.$queryRaw<{ threadId: string | null; replyId: string | null; name: string | null; username: string | null }[]>`
      SELECT x."threadId", x."replyId", u."name", u."username"
      FROM (
        SELECT r."userId", r."threadId", r."replyId",
               ROW_NUMBER() OVER (
                 PARTITION BY COALESCE(r."threadId", r."replyId")
                 ORDER BY r."createdAt" DESC
               ) AS rn
        FROM "Reaction" r
        WHERE r."type" = 'THANKS'::"ReactionType"
          AND (r."threadId" = ${id} OR r."replyId" = ANY(${thankTargets}::text[]))
      ) x
      JOIN "User" u ON u.id = x."userId"
      WHERE x.rn <= ${THANKS_NAMES_SHOWN}
    `,
    userId
      ? db.reaction.findMany({
          where: { userId, type: 'THANKS', OR: [{ threadId: id }, { replyId: { in: thankTargets } }] },
          select: { threadId: true, replyId: true },
        })
      : Promise.resolve([]),
  ]);

  const keyOf = (k: { threadId?: string | null; replyId?: string | null }) => k.threadId ?? k.replyId ?? '';
  const thankedByMe = new Set(myThanks.map(keyOf));
  const countByTarget = new Map(thankCounts.map((c) => [keyOf(c), c._count._all]));
  const namesByTarget = new Map<string, string[]>();
  for (const n of thankNames) {
    const k = keyOf(n);
    const list = namesByTarget.get(k) ?? [];
    list.push(n.name ?? n.username ?? 'Ẩn danh');
    namesByTarget.set(k, list);
  }
  // Tổng điểm đã tặng cho từng bài, cũng gom một lần rồi chia ở JS.
  const donationRows = await db.pointDonation.groupBy({
    by: ['threadId', 'replyId'],
    where: { OR: [{ threadId: id }, { replyId: { in: thankTargets } }] },
    _sum: { amount: true },
  });
  const donatedOf = (key: { threadId?: string; replyId?: string }): number =>
    donationRows.find((d) => (key.threadId ? d.threadId === key.threadId : d.replyId === key.replyId))?._sum.amount ?? 0;

  // Điểm của người đang xem — để bảng tặng không mời họ tặng thứ không có.
  const myPoints = userId
    ? (await db.user.findUnique({ where: { id: userId }, select: { points: true } }))?.points
    : undefined;

  const thanksOf = (key: { threadId?: string; replyId?: string }): ThanksState => {
    const k = keyOf(key);
    return {
      active: thankedByMe.has(k),
      people: namesByTarget.get(k) ?? [],
      count: countByTarget.get(k) ?? 0,
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
          <Link href="/" className="hover:text-brand-600">Diễn đàn</Link>
          <span>/</span>
          <Link href={`/forum/${thread.forum.slug}`} className="hover:text-brand-600">{thread.forum.name}</Link>
        </nav>

        {/* Bài mở đầu — bố cục diễn đàn: cột người đăng + nội dung */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {thread.pinned && <span className="chip gap-1 bg-brand-100 text-brand-600 dark:bg-brand-950/50"><Pin size={11} />Ghim</span>}
          {thread.locked && <span className="chip gap-1 bg-ink-100 text-ink-500 dark:bg-ink-800"><Lock size={11} />Đã khoá</span>}
          {thread.featured && <span className="chip gap-1 bg-violet-100 text-violet-600 dark:bg-violet-950/50"><Star size={11} />Tinh hoa</span>}
          {thread.solvedReplyId && <span className="chip gap-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><CheckCircle2 size={11} />Đã giải quyết</span>}
          {thread.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />Thưởng {fmtCount(thread.bountyPoints)} điểm</span> : null}
        </div>

        <div className="mb-1 flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug sm:text-2xl">{thread.title}</h1>
          {isOwner && <ThreadOwnerMenu threadId={thread.id} slug={slug} locked={thread.locked} />}
        </div>
        <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
          <span className="flex items-center gap-1"><Eye size={13} />{fmtCount(thread.viewCount)} lượt xem</span>
          <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(thread.replyCount)} trả lời</span>
        </p>

        {thread.poll && (
          <PollCard poll={toPollView(thread.poll, userId)}
            canClose={isOwner || canModerate} loggedIn={loggedIn} />
        )}

        <ThreadPost
          author={toAuthor(thread.author, levelLooks)}
          createdAt={thread.createdAt}
          index={1}
          actions={
            <ThreadActionBar threadId={thread.id} initialLiked={likedThread.has(thread.id)} initialLikeCount={thread.likeCount}
              initialFollowing={!!myFollow} initialFollowCount={followCount}
              initialSaved={!!mySave} initialSaveCount={saveCount}
              canReport={loggedIn && !isOwner}
              quoteHref={loggedIn ? `/forum/${slug}/${id}?td=md#tra-loi` : undefined}
              // Phần tử truyền qua prop từ Server Component cần key ổn định,
              // không thì React cảnh báo thiếu "key" ở chỗ nhận.
              modMenu={canModerate ? (
                <ThreadModMenu key="mod" threadId={thread.id} pinned={thread.pinned} locked={thread.locked} featured={thread.featured} forums={moveTargets} />
              ) : null} />
          }
        >
          <div className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderHidden(thread.content, hideView) }} />

          {offerHideBuy && (
            <HideUnlockButton threadId={thread.id} price={hidePrice} myPoints={myPoints}
              loggedIn={loggedIn} callbackUrl={callbackUrl} />
          )}

          <div className="mt-4">
            <ThanksBar threadId={thread.id} initial={thanksOf({ threadId: thread.id })}
              donated={donatedOf({ threadId: thread.id })} myPoints={myPoints}
              canThank={loggedIn && !isOwner} callbackUrl={callbackUrl} />
          </div>

          {thread.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              {thread.tags.map(({ tag }) => (
                <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip bg-ink-100 text-ink-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{tag.name}</Link>
              ))}
            </div>
          )}
        </ThreadPost>

        <h2 id="tra-loi" className="zib-title mb-3 mt-6 scroll-mt-20">
          {fmtCount(totalReplies)} trả lời
        </h2>

        {!replies || replies.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center text-ink-400">
            <MessageSquare size={26} />
            <p>Chưa có trả lời nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((r, i) => (
              <EditScope key={r.id}>
              <div className={cn(r.hidden && 'rounded-2xl ring-1 ring-rose-300 dark:ring-rose-900')}>
                {r.hidden && (
                  <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-medium text-rose-600">
                    <EyeOff size={12} /> Trả lời này đang bị ẩn, chỉ người kiểm duyệt thấy.
                  </p>
                )}
              <ThreadPost
                author={toAuthor(r.author, levelLooks)}
                createdAt={r.createdAt}
                index={(page - 1) * REPLIES_PER_PAGE + i + 2}
                isSolution={r.isSolution}
                actions={
                  <ReplyActions threadId={thread.id} replyId={r.id} initialLiked={likedReplies.has(r.id)} initialLikeCount={r.likeCount}
                    loggedIn={loggedIn} callbackUrl={callbackUrl} canReply canMarkSolution={canMarkSolution && !r.isSolution}
                    canReport={loggedIn && r.authorId !== userId}
                    canManage={r.authorId === userId && !thread.locked}
                    canModerate={canModerate} hidden={r.hidden}
                    quote={quoteBBCode(displayName(r.author), r.content)} />
                }
              >
                <ReplyBody replyId={r.id} content={r.content} createdAt={r.createdAt} updatedAt={r.updatedAt} />

                <div className="mt-3">
                  <ThanksBar replyId={r.id} initial={thanksOf({ replyId: r.id })}
                    donated={donatedOf({ replyId: r.id })} myPoints={myPoints}
                    canThank={loggedIn && r.authorId !== userId} callbackUrl={callbackUrl} />
                </div>

                {childrenShown(r).length > 0 && (
                  <ul className="mt-4 space-y-3 border-l-2 border-brand-200 pl-3 dark:border-brand-900">
                    {childrenShown(r).map((ch) => (
                      <EditScope key={ch.id}>
                      <li className={cn('rounded-lg bg-ink-50 p-3 dark:bg-ink-800/40',
                        ch.hidden && 'ring-1 ring-rose-300 dark:ring-rose-900')}>
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                          {ch.hidden && (
                            <span className="chip gap-1 bg-rose-100 !py-0 text-rose-600 dark:bg-rose-950/50">
                              <EyeOff size={11} /> Đang ẩn
                            </span>
                          )}
                          <Link href={`/u/${ch.author.username ?? ''}`} className="font-semibold text-ink-700 hover:text-brand-600 dark:text-ink-200">
                            {displayName(ch.author)}
                          </Link>
                          <LevelBadge level={ch.author.level}
                            color={levelLooks.get(ch.author.level)?.color} name={levelLooks.get(ch.author.level)?.name} />
                          <span className="text-ink-400">{format(ch.createdAt, 'HH:mm · dd/MM/yyyy')}</span>
                        </div>
                        <ReplyBody replyId={ch.id} content={ch.content} createdAt={ch.createdAt} updatedAt={ch.updatedAt} />
                        <ReplyActions threadId={thread.id} replyId={ch.id} initialLiked={likedReplies.has(ch.id)} initialLikeCount={ch.likeCount}
                          loggedIn={loggedIn} callbackUrl={callbackUrl} canMarkSolution={canMarkSolution && !ch.isSolution}
                          canReport={loggedIn && ch.authorId !== userId}
                          canManage={ch.authorId === userId && !thread.locked}
                          canModerate={canModerate} hidden={ch.hidden} />
                      </li>
                      </EditScope>
                    ))}

                    {r._count.children > childrenShown(r).length && (
                      <li className="pl-1">
                        <Link href={`?p=${page}&r=${r.id}#${r.id}`} scroll={false}
                          className="text-sm font-medium text-brand-600 hover:underline">
                          Xem tất cả {fmtCount(r._count.children)} phản hồi
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </ThreadPost>
              </div>
              </EditScope>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} basePath={`/forum/${slug}/${id}`} pageParam="p" />
          </div>
        )}

        {/* Ai đang mở chủ đề này ngay lúc này */}
        <WhoIsHere scope={`thread:${id}`} />

        {/* Ô trả lời chủ đề */}
        {!thread.locked ? (
          <div className="card mt-4 p-4">
            <h3 className="mb-2 text-sm font-semibold">Viết trả lời</h3>
            <ReplyForm threadId={thread.id} loggedIn={loggedIn} callbackUrl={callbackUrl}
              defaultValue={quoteSeed} autoFocus={!!quoteSeed} />
          </div>
        ) : (
          <div className="card mt-4 flex items-center justify-center gap-2 p-4 text-sm text-ink-400">
            <Lock size={14} /> Chủ đề đã bị khoá, không thể trả lời.
          </div>
        )}
      </div>

      <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
    </div>
  );
}





