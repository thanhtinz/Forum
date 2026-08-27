import Link from 'next/link';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ReportButton } from '@/components/ReportButton';
import { CommentModActions } from './CommentModActions';
import { cn } from '@/lib/utils';
import { CommentForm } from './CommentForm';
import { CommentReply } from './CommentReply';
import { CommentBody } from './CommentBody';
import { CommentOwnerActions } from './CommentOwnerActions';
import { EditScope } from '@/components/EditScope';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { authorChipSelect, toCosmetics } from '@/lib/shop';

/**
 * Danh sách bình luận phân cấp 1 mức (bình luận gốc + phản hồi).
 *
 * Dùng chung cho bài viết và cho game — truyền `postId` hoặc `gameId`. Game
 * không có tác giả nên chỉ ban quản trị mới kiểm duyệt được bình luận ở đó.
 */
export async function Comments({ postId, gameId, slug, loggedIn, basePath = '/posts' }: {
  postId?: string;
  gameId?: string;
  slug: string;
  loggedIn: boolean;
  /** Tiền tố đường dẫn để quay lại sau khi đăng nhập: /posts hoặc /games. */
  basePath?: '/posts' | '/games';
}) {
  const session = await auth();
  const me = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;

  // Chủ bài viết và quản trị viên quản lý được bình luận trong bài này, và
  // thấy cả bình luận đang ẩn (có dấu riêng) để còn hiện lại được.
  const owner = postId
    ? await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
    : null;
  const canManage = !!me && (owner?.authorId === me || role === 'ADMIN' || role === 'MODERATOR');

  const roots = await db.comment.findMany({
    where: { postId: postId ?? null, gameId: gameId ?? null, parentId: null, ...(canManage ? {} : { hidden: false }) },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      author: { select: authorChipSelect },
      children: {
        where: canManage ? {} : { hidden: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: authorChipSelect } },
      },
    },
  });

  const callbackUrl = `${basePath}/${slug}`;

  return (
    <div className="space-y-6">
      <CommentForm postId={postId} gameId={gameId} slug={slug} loggedIn={loggedIn} callbackUrl={callbackUrl} />

      {roots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-ink-400">
          <MessageSquare size={28} />
          <p>Chưa có bình luận. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentRow c={c} me={me} canManage={canManage}
                postId={postId} gameId={gameId} slug={slug} callbackUrl={callbackUrl} rootId={c.id} />
              {c.children.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                  {c.children.map((ch) => (
                    <li key={ch.id}>
                      {/* Phản hồi cho phản hồi vẫn gắn vào bình luận gốc: danh sách chỉ lồng một mức. */}
                      <CommentRow c={ch} me={me} canManage={canManage} small
                        postId={postId} gameId={gameId} slug={slug} callbackUrl={callbackUrl} rootId={c.id} />
                    </li>
                  ))}
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
  id: string; content: string; createdAt: Date; updatedAt: Date;
  pinned?: boolean; hidden?: boolean; authorId: string;
  author: {
    username: string | null; name: string | null; image: string | null; level: number; role: string;
    nameColor: { value: string } | null;
    avatarFrame: { value: string } | null;
    shopBadge: { value: string; name: string } | null;
  } | null;
};

function CommentRow({ c, me, canManage, small, postId, gameId, slug, callbackUrl, rootId }: {
  c: Row; me: string | null; canManage: boolean; small?: boolean;
  postId?: string; gameId?: string; slug: string; callbackUrl: string;
  /** Bình luận gốc của nhánh — nơi phản hồi mới sẽ gắn vào. */
  rootId: string;
}) {
  const name = c.author?.name ?? c.author?.username ?? 'Ẩn danh';
  const isOwner = !!me && me === c.authorId;
  return (
    <EditScope>
    <div id={`bl-${c.id}`} data-comment-id={c.id}
      className={cn('flex gap-3', c.hidden && 'rounded-lg p-2 ring-1 ring-rose-200 dark:ring-rose-900')}>
      <Link href={`/u/${c.author?.username ?? ''}`} className="shrink-0">
        <Avatar image={c.author?.image ?? null} name={name} cosmetics={toCosmetics(c.author)} size={small ? 32 : 40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserName username={c.author?.username ?? null} name={c.author?.name ?? null}
            role={c.author?.role} cosmetics={toCosmetics(c.author)} />
          {c.pinned && <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50">Ghim</span>}
          {c.hidden && <span className="chip bg-rose-100 text-rose-600 dark:bg-rose-950/50">Đang ẩn</span>}
          <span className="text-xs text-ink-400">{format(c.createdAt, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <CommentBody commentId={c.id} content={c.content} createdAt={c.createdAt} updatedAt={c.updatedAt}
          className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700 dark:text-ink-200" />
        {(canManage || !!me) && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {me && !c.hidden && (
              <CommentReply postId={postId} gameId={gameId} slug={slug} rootId={rootId} callbackUrl={callbackUrl}
                mention={small ? c.author?.username : null} />
            )}
            {isOwner && <CommentOwnerActions commentId={c.id} />}
            {me && me !== c.authorId && (
              <ReportButton target="comment" targetId={c.id}
                className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-red-500" />
            )}
            {canManage && <CommentModActions commentId={c.id} pinned={!!c.pinned} hidden={!!c.hidden} />}
          </div>
        )}
      </div>
    </div>
    </EditScope>
  );
}
