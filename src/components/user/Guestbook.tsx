import Link from 'next/link';
import { BookOpen, CornerDownRight, EyeOff, Lock } from 'lucide-react';
import { ReplyContent } from '@/components/forum/ReplyContent';
import { Pagination } from '@/components/Pagination';
import { GuestbookForm } from '@/components/user/GuestbookForm';
import { GuestbookReplyForm, RemoveEntryButton, RestoreEntryButton } from '@/components/user/GuestbookEntryActions';
import { fmtAgo, fmtCount, nickClass } from '@/lib/utils';
import type { GuestbookItem } from '@/lib/guestbook-const';

/**
 * Sổ lưu bút trên trang cá nhân.
 *
 * Chỉ dựng phần hiển thị — việc lọc lời kín / lời đã gỡ đã làm ở truy vấn,
 * nên những gì tới đây đều là thứ người xem được phép đọc.
 */
export function Guestbook({ username, ownerName, items, total, page, totalPages, viewerId, isOwner, staff, loggedIn }: {
  username: string;
  ownerName: string;
  items: GuestbookItem[];
  total: number;
  page: number;
  totalPages: number;
  viewerId: string | null;
  isOwner: boolean;
  staff: boolean;
  loggedIn: boolean;
}) {
  return (
    <section id="so-luu-but" className="mt-8 scroll-mt-20">
      <h2 className="zib-title mb-4 flex items-center gap-2">
        <BookOpen size={18} /> Sổ lưu bút
        {total > 0 && <span className="retro-count">{fmtCount(total)}</span>}
      </h2>

      <GuestbookForm username={username} loggedIn={loggedIn} self={isOwner}
        callbackUrl={`/u/${username}#so-luu-but`} />

      {items.length === 0 ? (
        <p className="card mt-3 p-8 text-center text-sm text-ink-400">
          Sổ còn trắng. Ghi lời đầu tiên cho {ownerName} đi.
        </p>
      ) : (
        <ul className="card retro-stripe mt-3 divide-y divide-ink-100 dark:divide-ink-800">
          {items.map((e) => (
            <li key={e.id} className={`p-4 ${e.hidden ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.author.image
                  ? <img src={e.author.image} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
                  : <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500 font-bold text-white">
                      {(e.author.name ?? e.author.username ?? '?')[0]?.toUpperCase()}
                    </span>}

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/u/${e.author.username ?? ''}`}
                      className={`font-bold hover:underline ${nickClass(e.author.role)}`}>
                      {e.author.name ?? e.author.username}
                    </Link>
                    <span className="retro-sub text-ink-400">Lv{e.author.level}</span>
                    <span className="retro-sub text-ink-400">· {fmtAgo(e.createdAt)}</span>
                    {e.private && (
                      <span className="chip gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50" title="Chỉ chủ nhà và người viết đọc được">
                        <Lock size={12} /> lời kín
                      </span>
                    )}
                    {e.hidden && (
                      <span className="chip gap-1 bg-rose-100 text-rose-700 dark:bg-rose-950/50">
                        <EyeOff size={12} /> đã gỡ
                      </span>
                    )}
                  </p>

                  <ReplyContent content={e.content} className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200" />

                  {e.reply && (
                    <div className="retro-rule mt-2 pt-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-400">
                        <CornerDownRight size={13} /> {ownerName} hồi âm
                        {e.repliedAt && <span className="font-normal"> · {fmtAgo(e.repliedAt)}</span>}
                      </p>
                      <ReplyContent content={e.reply} className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-600 dark:text-ink-300" />
                    </div>
                  )}

                  {/* Chỉ chủ nhà hồi âm, và không hồi âm lời đã gỡ. */}
                  {isOwner && !e.hidden && <GuestbookReplyForm id={e.id} initial={e.reply} />}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {e.canRemove && !e.hidden && <RemoveEntryButton id={e.id} />}
                  {staff && e.hidden && <RestoreEntryButton id={e.id} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Trang của sổ đi riêng với trang bài viết, nên dùng tham số khác. */}
      <Pagination page={page} totalPages={totalPages} pageParam="gb" basePath={`/u/${username}`} />

      {viewerId === null && total > 0 && (
        <p className="retro-sub mt-2 text-center text-ink-400">Đăng nhập để ghi lời nhắn của bạn.</p>
      )}
    </section>
  );
}
