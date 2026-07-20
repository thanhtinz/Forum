import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Pin, Lock, Award, CheckCircle2, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount, truncate } from '@/lib/utils';
import { HomeSidebar } from '@/components/HomeSidebar';

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
          <Link href="/forum" className="hover:text-brand-600">Diễn đàn</Link>
          <span>/</span>
          <Link href={`/forum/${thread.forum.slug}`} className="hover:text-brand-600">{thread.forum.name}</Link>
        </nav>

        <article className="card p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {thread.pinned && <span className="chip gap-1 bg-brand-100 text-brand-600 dark:bg-brand-950/50"><Pin size={11} />Ghim</span>}
            {thread.locked && <span className="chip gap-1 bg-ink-100 text-ink-500 dark:bg-ink-800"><Lock size={11} />Đã khoá</span>}
            {thread.solvedReplyId && <span className="chip gap-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><CheckCircle2 size={11} />Đã giải quyết</span>}
            {thread.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />Thưởng {fmtCount(thread.bountyPoints)}đ</span> : null}
          </div>
          <h1 className="text-2xl font-bold leading-snug">{thread.title}</h1>

          <div className="mt-3 flex items-center gap-3 border-b border-ink-100 pb-4 dark:border-ink-800">
            <Avatar user={thread.author} />
            <div className="min-w-0">
              <p className="font-semibold">{displayName(thread.author)}</p>
              <p className="text-xs text-ink-400">{format(thread.createdAt, 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1"><Eye size={13} />{fmtCount(thread.viewCount)}</span>
              <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(thread.replyCount)}</span>
              <span className="flex items-center gap-1"><ThumbsUp size={13} />{fmtCount(thread.likeCount)}</span>
            </div>
          </div>

          <div className="prose prose-sm mt-4 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: thread.content }} />

          {thread.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
              {thread.tags.map(({ tag }) => (
                <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip bg-ink-100 text-ink-500 hover:text-brand-600 dark:bg-ink-800">#{tag.name}</Link>
              ))}
            </div>
          )}
        </article>

        <h2 className="mb-3 mt-6 flex items-center gap-2 font-bold">
          <MessageSquare size={18} /> {fmtCount(replies?.length ?? 0)} trả lời
        </h2>

        {!replies || replies.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center text-ink-400">
            <MessageSquare size={26} />
            <p>Chưa có trả lời nào cho chủ đề này.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {replies.map((r) => (
              <li key={r.id} className={`card p-4 ${r.isSolution ? 'ring-2 ring-emerald-400/60' : ''}`}>
                {r.isSolution && (
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={15} /> Câu trả lời được chọn
                  </p>
                )}
                <ReplyRow r={r} />
                {r.children.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                    {r.children.map((ch) => <li key={ch.id}><ReplyRow r={ch} small /></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}

type UserBits = { username: string | null; name: string | null; image: string | null; level: number };
type ReplyBits = { id: string; content: string; createdAt: Date; likeCount: number; author: UserBits };

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

function ReplyRow({ r, small }: { r: ReplyBits; small?: boolean }) {
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
        {r.likeCount > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-400"><ThumbsUp size={12} />{fmtCount(r.likeCount)}</p>
        )}
      </div>
    </div>
  );
}
