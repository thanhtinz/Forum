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
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { canModerateForum } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const thread = await db.thread.findUnique({ where: { id }, select: { title: true, content: true } });
  return thread
    ? { title: thread.title, description: truncate(thread.content.replace(/<[^>]+>/g, ' '), 160) }
    : { title: 'Không tìm thấy chủ đề' };
}

const authorSelect = { select: { username: true, name: true, image: true, level: true } } as const;

export default async function ThreadPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;

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
  db.thread.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

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

  const replies = await db.thread
    .findUnique({ where: { id } })
    .replies({
      where: { parentId: null, hidden: false },
      orderBy: [{ isSolution: 'desc' }, { createdAt: 'asc' }],
      include: {
        author: authorSelect,
        children: {
          where: { hidden: false },
          orderBy: { createdAt: 'asc' },
          include: { author: authorSelect },
        },
      },
    });

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

        {/* Bài chủ đề */}
        <article className="card p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {thread.pinned && <span className="chip gap-1 bg-brand-100 text-brand-600 dark:bg-brand-950/50"><Pin size={11} />Ghim</span>}
            {thread.locked && <span className="chip gap-1 bg-ink-100 text-ink-500 dark:bg-ink-800"><Lock size={11} />Đã khoá</span>}
            {thread.featured && <span className="chip gap-1 bg-violet-100 text-violet-600 dark:bg-violet-950/50"><Star size={11} />Tinh hoa</span>}
            {thread.solvedReplyId && <span className="chip gap-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><CheckCircle2 size={11} />Đã giải quyết</span>}
            {thread.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />Thưởng {fmtCount(thread.bountyPoints)}đ</span> : null}
          </div>
          <h1 className="text-2xl font-bold leading-snug">{thread.title}</h1>

          <div className="mt-3 flex items-center gap-3 border-b border-ink-100 pb-4 dark:border-ink-800">
            <Avatar user={thread.author} />
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                {displayName(thread.author)}
                <span className="chip bg-ink-100 !py-0 text-ink-400 dark:bg-ink-800">Lv.{thread.author.level}</span>
              </p>
              <p className="text-xs text-ink-400">{format(thread.createdAt, 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1"><Eye size={13} />{fmtCount(thread.viewCount)}</span>
              <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(thread.replyCount)}</span>
            </div>
          </div>

          <div className="prose prose-sm mt-4 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: thread.content }} />

          {thread.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {thread.tags.map(({ tag }) => (
                <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip bg-ink-100 text-ink-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{tag.name}</Link>
              ))}
            </div>
          )}

          <ThreadActionBar threadId={thread.id} initialLiked={likedThread.has(thread.id)} initialLikeCount={thread.likeCount}
            modMenu={canModerate ? (
              <ThreadModMenu threadId={thread.id} pinned={thread.pinned} locked={thread.locked} featured={thread.featured} forums={moveTargets} />
            ) : null} />
        </article>

        <h2 id="tra-loi" className="zib-title mb-4 mt-6 flex items-center gap-2 scroll-mt-20">
          {fmtCount(replies?.length ?? 0)} trả lời
        </h2>

        {!replies || replies.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center text-ink-400">
            <MessageSquare size={26} />
            <p>Chưa có trả lời nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {replies.map((r) => (
              <li key={r.id} className={`card p-4 ${r.isSolution ? 'ring-2 ring-emerald-400/60' : ''}`}>
                {r.isSolution && (
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={15} /> Câu trả lời được chọn
                  </p>
                )}
                <ReplyRow r={r} threadId={thread.id} loggedIn={loggedIn} callbackUrl={callbackUrl}
                  liked={likedReplies.has(r.id)} canReply canMarkSolution={canMarkSolution && !r.isSolution} />
                {r.children.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                    {r.children.map((ch) => (
                      <li key={ch.id}>
                        <ReplyRow r={ch} threadId={thread.id} loggedIn={loggedIn} callbackUrl={callbackUrl}
                          liked={likedReplies.has(ch.id)} small canMarkSolution={canMarkSolution && !ch.isSolution} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
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

type UserBits = { username: string | null; name: string | null; image: string | null; level: number };
type ReplyBits = { id: string; content: string; createdAt: Date; likeCount: number; isSolution: boolean; author: UserBits };

function displayName(u: UserBits) {
  return u?.name ?? u?.username ?? 'Ẩn danh';
}

function Avatar({ user, small }: { user: UserBits; small?: boolean }) {
  const size = small ? 'h-8 w-8' : 'h-10 w-10';
  const name = displayName(user);
  return (
    <Link href={`/u/${user?.username ?? ''}`} className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {user?.image
        ? <img src={user.image} alt="" className={`${size} rounded-full object-cover`} />
        : <span className={`grid ${size} place-items-center rounded-full bg-ink-200 font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200`}>{name[0]?.toUpperCase()}</span>}
    </Link>
  );
}

function ReplyRow({ r, threadId, loggedIn, callbackUrl, liked, small, canReply, canMarkSolution }: {
  r: ReplyBits; threadId: string; loggedIn: boolean; callbackUrl: string; liked: boolean;
  small?: boolean; canReply?: boolean; canMarkSolution?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Avatar user={r.author} small={small} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{displayName(r.author)}</span>
          <span className="chip bg-ink-100 !py-0 text-ink-400 dark:bg-ink-800">Lv.{r.author.level}</span>
          <span className="text-xs text-ink-400">{format(r.createdAt, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">{r.content}</p>
        <ReplyActions threadId={threadId} replyId={r.id} initialLiked={liked} initialLikeCount={r.likeCount}
          loggedIn={loggedIn} callbackUrl={callbackUrl} canReply={canReply} canMarkSolution={canMarkSolution} />
      </div>
    </div>
  );
}
