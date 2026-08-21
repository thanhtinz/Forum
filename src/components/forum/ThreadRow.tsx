import Link from 'next/link';
import { Pin, Lock, MessageSquare, Eye, Award, CheckCircle2 } from 'lucide-react';
import { fmtCount, fmtAgo } from '@/lib/utils';

export interface ThreadRowData {
  id: string;
  title: string;
  createdAt: Date;
  lastReplyAt: Date | null;
  pinned: boolean;
  locked: boolean;
  solved: boolean;
  bountyPoints: number | null;
  viewCount: number;
  replyCount: number;
  author: { username: string | null; name: string | null; image: string | null } | null;
  forum?: { slug: string; name: string } | null;
  excerpt?: string | null;
}

/**
 * Một dòng chủ đề kiểu diễn đàn wap: avatar, tiêu đề, dòng meta gọn,
 * bên phải là số trả lời — đủ dày để lướt nhanh trên điện thoại.
 */
export function ThreadRow({ thread, forumSlug, showForum }: { thread: ThreadRowData; forumSlug?: string; showForum?: boolean }) {
  const slug = forumSlug ?? thread.forum?.slug;
  const name = thread.author?.name ?? thread.author?.username ?? 'Ẩn danh';
  const at = thread.lastReplyAt ?? thread.createdAt;

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
      <Link href={`/u/${thread.author?.username ?? ''}`} className="shrink-0" aria-label={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thread.author?.image
          ? <img src={thread.author.image} alt="" className="size-9 rounded-full object-cover" />
          : <span className="grid size-9 place-items-center rounded-full bg-ink-200 text-sm font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">{name[0]?.toUpperCase()}</span>}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {thread.pinned && <Pin size={13} className="shrink-0 text-brand-500" aria-label="Ghim" />}
          {thread.locked && <Lock size={13} className="shrink-0 text-ink-400" aria-label="Đã khoá" />}
          <Link href={slug ? `/forum/${slug}/${thread.id}` : '#'} className="line-clamp-2 font-semibold leading-snug text-ink-900 group-hover:text-brand-600 dark:text-white">
            {thread.title}
          </Link>
          {thread.solved && <CheckCircle2 size={13} className="shrink-0 text-emerald-500" aria-label="Đã giải quyết" />}
          {thread.bountyPoints ? (
            <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />{fmtCount(thread.bountyPoints)}</span>
          ) : null}
        </div>

        {thread.excerpt && <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{thread.excerpt}</p>}

        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-400">
          <Link href={`/u/${thread.author?.username ?? ''}`} className="font-medium hover:text-brand-600">{name}</Link>
          <span>·</span>
          <span>{fmtAgo(at)}</span>
          {showForum && thread.forum && (
            <>
              <span>·</span>
              <Link href={`/forum/${thread.forum.slug}`} className="chip bg-ink-100 !py-0 text-[11px] text-ink-500 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">
                {thread.forum.name}
              </Link>
            </>
          )}
          <span className="ml-auto flex items-center gap-2 sm:hidden">
            <span className="flex items-center gap-0.5"><Eye size={12} />{fmtCount(thread.viewCount)}</span>
            <span className="flex items-center gap-0.5"><MessageSquare size={12} />{fmtCount(thread.replyCount)}</span>
          </span>
        </p>
      </div>

      <div className="hidden w-16 shrink-0 flex-col items-center gap-0.5 text-xs text-ink-400 sm:flex">
        <span className="rounded-lg bg-ink-100 px-2 py-0.5 text-sm font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-100">{fmtCount(thread.replyCount)}</span>
        <span>trả lời</span>
      </div>
      <div className="hidden w-20 shrink-0 flex-col items-center gap-0.5 text-xs text-ink-400 md:flex">
        <span className="text-sm font-bold text-ink-700 dark:text-ink-100">{fmtCount(thread.viewCount)}</span>
        <span>lượt xem</span>
      </div>
    </div>
  );
}
