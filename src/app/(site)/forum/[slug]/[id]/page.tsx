import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Pin, Lock, Award, CheckCircle2, Eye, MessageSquare, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount, truncate } from '@/lib/utils';
import { ThreadActionBar } from '@/components/forum/ThreadActionBar';
import { ReplyActions } from '@/components/forum/ReplyActions';
import { ReplyForm } from '@/components/forum/ReplyForm';
import { ThreadModMenu } from '@/components/forum/ThreadModMenu';
import { ThreadOwnerMenu } from '@/components/forum/ThreadOwnerMenu';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { ThreadPost, displayName } from '@/components/forum/ThreadPost';
import { Pagination } from '@/components/Pagination';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { canModerateForum } from '@/lib/moderation';
import { getLevelLooks, type LevelLook } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const thread = await db.thread.findUnique({ where: { id }, select: { title: true, content: true } });
  return thread
    ? { title: thread.title, description: truncate(thread.content.replace(/<[^>]+>/g, ' '), 160) }
    : { title: 'Không tìm thấy chủ đề' };
}

const authorSelect = {
  select: {
    username: true, name: true, image: true, level: true, createdAt: true,
    _count: { select: { threads: true, replies: true } },
  },
} as const;

/** Gộp số chủ đề + số trả lời thành "số bài", kèm huy hiệu cấp của người đăng. */
function toAuthor(
  u: { username: string | null; name: string | null; image: string | null; level: number; createdAt: Date; _count: { threads: number; replies: number } },
  looks: Map<number, LevelLook>,
) {
  const look = looks.get(u.level);
  return {
    ...u,
    postCount: u._count.threads + u._count.replies,
    levelIcon: look?.icon ?? null,
    levelColor: look?.color ?? null,
    levelName: look?.name ?? null,
  };
}

const REPLIES_PER_PAGE = 10;

export default async function ThreadPage({ params, searchParams }: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { slug, id } = await params;
  const { p: pageRaw } = await searchParams;

  const thread = await db.thread.findUnique({
    where: { id },
    include: {
      forum: { select: { slug: true, name: true } },
      author: authorSelect,
      tags: { include: { tag: { select: { slug: true, name: true } } } },
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

  const canModerate = await canModerateForum(
    session?.user ? { id: session.user.id, role: (session.user as { role?: string }).role } : null,
    thread.forumId,
  );
  const moveTargets = canModerate
    ? await db.forum.findMany({
        where: { id: { not: thread.forumId } },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      })
    : [];

  const levelLooks = await getLevelLooks();

  const totalReplies = await db.reply.count({ where: { threadId: id, parentId: null, hidden: false } });
  const totalPages = Math.max(1, Math.ceil(totalReplies / REPLIES_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, parseInt(pageRaw ?? '1', 10) || 1));

  const replies = await db.reply.findMany({
    where: { threadId: id, parentId: null, hidden: false },
    orderBy: [{ isSolution: 'desc' }, { createdAt: 'asc' }],
    skip: (page - 1) * REPLIES_PER_PAGE,
    take: REPLIES_PER_PAGE,
    include: {
      author: authorSelect,
      children: {
        where: { hidden: false },
        orderBy: { createdAt: 'asc' },
        include: { author: authorSelect },
      },
    },
  });

  // Số người theo dõi chủ đề và trạng thái theo dõi của người đang xem
  const [followCount, myFollow] = await Promise.all([
    db.threadFollow.count({ where: { threadId: id } }),
    userId
      ? db.threadFollow.findUnique({ where: { threadId_userId: { threadId: id, userId } }, select: { id: true } })
      : null,
  ]);

  // Trạng thái "đã thích" của người dùng hiện tại (chủ đề + mọi trả lời)
  const likedThread = new Set<string>();
  const likedReplies = new Set<string>();
  if (userId) {
    const replyIds = (replies ?? []).flatMap((r) => [r.id, ...r.children.map((c) => c.id)]);
    const reactions = await db.reaction.findMany({
      where: { userId, type: 'LIKE', OR: [{ threadId: id }, { replyId: { in: replyIds } }] },
      select: { threadId: true, replyId: true },
    });
    for (const rx of reactions) {
      if (rx.threadId) likedThread.add(rx.threadId);
      if (rx.replyId) likedReplies.add(rx.replyId);
    }
  }

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
          {thread.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />Thưởng {fmtCount(thread.bountyPoints)}đ</span> : null}
        </div>

        <div className="mb-1 flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug sm:text-2xl">{thread.title}</h1>
          {isOwner && <ThreadOwnerMenu threadId={thread.id} slug={slug} locked={thread.locked} />}
        </div>
        <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
          <span className="flex items-center gap-1"><Eye size={13} />{fmtCount(thread.viewCount)} lượt xem</span>
          <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(thread.replyCount)} trả lời</span>
        </p>

        <ThreadPost
          author={toAuthor(thread.author, levelLooks)}
          createdAt={thread.createdAt}
          index={1}
          actions={
            <ThreadActionBar threadId={thread.id} initialLiked={likedThread.has(thread.id)} initialLikeCount={thread.likeCount}
              initialFollowing={!!myFollow} initialFollowCount={followCount}
              modMenu={canModerate ? (
                <ThreadModMenu threadId={thread.id} pinned={thread.pinned} locked={thread.locked} featured={thread.featured} forums={moveTargets} />
              ) : null} />
          }
        >
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: thread.content }} />
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
              <ThreadPost
                key={r.id}
                author={toAuthor(r.author, levelLooks)}
                createdAt={r.createdAt}
                index={(page - 1) * REPLIES_PER_PAGE + i + 2}
                isSolution={r.isSolution}
                actions={
                  <ReplyActions threadId={thread.id} replyId={r.id} initialLiked={likedReplies.has(r.id)} initialLikeCount={r.likeCount}
                    loggedIn={loggedIn} callbackUrl={callbackUrl} canReply canMarkSolution={canMarkSolution && !r.isSolution} />
                }
              >
                <ReplyContent content={r.content} />

                {r.children.length > 0 && (
                  <ul className="mt-4 space-y-3 border-l-2 border-brand-200 pl-3 dark:border-brand-900">
                    {r.children.map((ch) => (
                      <li key={ch.id} className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/40">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                          <Link href={`/u/${ch.author.username ?? ''}`} className="font-semibold text-ink-700 hover:text-brand-600 dark:text-ink-200">
                            {displayName(ch.author)}
                          </Link>
                          <LevelBadge level={ch.author.level} icon={levelLooks.get(ch.author.level)?.icon}
                            color={levelLooks.get(ch.author.level)?.color} name={levelLooks.get(ch.author.level)?.name} />
                          <span className="text-ink-400">{format(ch.createdAt, 'HH:mm · dd/MM/yyyy')}</span>
                        </div>
                        <ReplyContent content={ch.content} />
                        <ReplyActions threadId={thread.id} replyId={ch.id} initialLiked={likedReplies.has(ch.id)} initialLikeCount={ch.likeCount}
                          loggedIn={loggedIn} callbackUrl={callbackUrl} canMarkSolution={canMarkSolution && !ch.isSolution} />
                      </li>
                    ))}
                  </ul>
                )}
              </ThreadPost>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} basePath={`/forum/${slug}/${id}`} pageParam="p" />
          </div>
        )}

        {/* Ô trả lời chủ đề */}
        {!thread.locked ? (
          <div className="card mt-4 p-4">
            <h3 className="mb-2 text-sm font-semibold">Viết trả lời</h3>
            <ReplyForm threadId={thread.id} loggedIn={loggedIn} callbackUrl={callbackUrl} />
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





