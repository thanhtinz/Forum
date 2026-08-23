import Link from 'next/link';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ReportButton } from '@/components/ReportButton';
import { CommentModActions } from './CommentModActions';
import { cn } from '@/lib/utils';
import { CommentForm } from './CommentForm';
import { ReplyContent } from '@/components/forum/ReplyContent';

/** Danh sách bình luận phân cấp 1 mức (bình luận gốc + phản hồi). */
export async function Comments({ postId, slug, loggedIn }: { postId: string; slug: string; loggedIn: boolean }) {
  const session = await auth();
  const me = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;

  // Chủ bài viết và quản trị viên quản lý được bình luận trong bài này, và
  // thấy cả bình luận đang ẩn (có dấu riêng) để còn hiện lại được.
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  const canManage = !!me && (post?.authorId === me || role === 'ADMIN' || role === 'MODERATOR');

  const roots = await db.comment.findMany({
    where: { postId, parentId: null, ...(canManage ? {} : { hidden: false }) },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      author: { select: { username: true, name: true, image: true } },
      children: {
        where: canManage ? {} : { hidden: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { username: true, name: true, image: true } } },
      },
    },
  });

  const callbackUrl = `/posts/${slug}`;

  return (
    <div className="space-y-6">
      <CommentForm postId={postId} slug={slug} loggedIn={loggedIn} callbackUrl={callbackUrl} />

      {roots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-ink-400">
          <MessageSquare size={28} />
          <p>Chưa có bình luận. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentRow c={c} me={me} canManage={canManage} />
              {c.children.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                  {c.children.map((ch) => <li key={ch.id}><CommentRow c={ch} me={me} canManage={canManage} small /></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Row = {
  id: string; content: string; createdAt: Date; pinned?: boolean; hidden?: boolean; authorId: string;
  author: { username: string | null; name: string | null; image: string | null };
};

function CommentRow({ c, me, canManage, small }: { c: Row; me: string | null; canManage: boolean; small?: boolean }) {
  const name = c.author?.name ?? c.author?.username ?? 'Ẩn danh';
  const size = small ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <div id={`bl-${c.id}`} data-comment-id={c.id}
      className={cn('flex gap-3', c.hidden && 'rounded-lg p-2 ring-1 ring-rose-200 dark:ring-rose-900')}>
      <Link href={`/u/${c.author?.username ?? ''}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.author?.image
          ? <img src={c.author.image} alt="" className={`${size} rounded-full object-cover`} />
          : <span className={`grid ${size} place-items-center rounded-full bg-ink-200 text-sm font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200`}>{name[0]?.toUpperCase()}</span>}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{name}</span>
          {c.pinned && <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50">Ghim</span>}
          {c.hidden && <span className="chip bg-rose-100 text-rose-600 dark:bg-rose-950/50">Đang ẩn</span>}
          <span className="text-xs text-ink-400">{format(c.createdAt, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <ReplyContent content={c.content}
          className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700 dark:text-ink-200" />
        {(canManage || (me && me !== c.authorId)) && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {me && me !== c.authorId && (
              <ReportButton target="comment" targetId={c.id}
                className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-red-500" />
            )}
            {canManage && <CommentModActions commentId={c.id} pinned={!!c.pinned} hidden={!!c.hidden} />}
          </div>
        )}
      </div>
    </div>
  );
}
