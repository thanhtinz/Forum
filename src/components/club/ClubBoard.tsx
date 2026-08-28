'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2, Heart, MessageCircle, Pin, PinOff } from 'lucide-react';
import {
  postToClub, deleteClubPost, toggleClubPostLike, toggleClubPostPin,
} from '@/app/(site)/clb/actions';
import { UserName, Avatar } from '@/components/user/Cosmetic';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { ClubComments, type ClubCommentNodeView } from '@/components/club/ClubComments';
import { CLUB_POST_MAX, CLUB_COMMENTS_SHOWN, type ClubActionState } from '@/lib/club-const';
import { cn, fmtAgo, fmtCount } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export interface ClubPostView {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: AuthorChip | null;
  pinned: boolean;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  comments: ClubCommentNodeView[];
}

/** Đếm cả cây, kể cả bình luận con — để biết còn bao nhiêu dòng chưa hiện. */
function countTree(list: ClubCommentNodeView[]): number {
  return list.reduce((n, c) => n + 1 + countTree(c.children), 0);
}

/** Bảng tin câu lạc bộ: ô soạn ở trên, bài ghim trước rồi tới bài mới nhất. */
export function ClubBoard({ clubId, clubSlug, canPost, canManage, posts, viewerId, expandId }: {
  clubId: string;
  clubSlug: string;
  canPost: boolean;
  canManage: boolean;
  posts: ClubPostView[];
  viewerId: string | null;
  expandId: string | null;
}) {
  const router = useRouter();
  const [state, action, sending] = useActionState<ClubActionState, FormData>(postToClub, {});
  const [seq, setSeq] = useState(0);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Đăng xong thì dọn ô soạn và lấy lại danh sách. `seq` đổi làm React dựng ô
  // soạn mới — ô soạn giữ nội dung trong state của chính nó nên không tự trống.
  useEffect(() => {
    if (state.ok) { setSeq((s) => s + 1); router.refresh(); }
  }, [state, router]);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      router.refresh();
    });
  };

  return (
    <section>
      {canPost && (
        <form action={action} className="card mb-4 p-3.5">
          <input type="hidden" name="clubId" value={clubId} />
          <BBCodeEditor key={seq} name="content" rows={4} maxLength={CLUB_POST_MAX} media
            placeholder="Nói gì đó với cả nhóm…" />
          {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
          <div className="mt-2.5 text-right">
            <button type="submit" disabled={sending} className="btn-primary !py-2 disabled:opacity-60">
              <Send size={15} /> {sending ? 'Đang đăng…' : 'Đăng lên bảng tin'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">
          Bảng tin còn trống. {canPost ? 'Đăng bài đầu tiên đi!' : 'Vào nhóm để cùng đăng bài.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const hidden = p.commentCount - countTree(p.comments);
            return (
              <li key={p.id} className={cn('card p-3.5', p.pinned && 'border-amber-300 dark:border-amber-800')}>
                {p.pinned && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Pin size={13} /> Bài ghim
                  </p>
                )}

                <div className="flex items-start gap-2.5">
                  <Avatar image={p.author?.image ?? null} name={p.author?.name ?? p.author?.username ?? '?'}
                    cosmetics={p.author?.cosmetics} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      {p.author && (
                        <UserName username={p.author.username} name={p.author.name} role={p.author.role}
                          level={p.author.level} cosmetics={p.author.cosmetics} />
                      )}
                      <span className="retro-sub text-ink-400">· {fmtAgo(p.createdAt)}</span>
                    </p>
                    <div className="prose prose-sm mt-1 max-w-none dark:prose-invert prose-img:max-h-72 prose-img:rounded-lg"
                      dangerouslySetInnerHTML={{ __html: p.content }} />
                  </div>

                  <span className="flex shrink-0 items-center gap-0.5">
                    {canManage && (
                      <button type="button" title={p.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'} disabled={busy}
                        onClick={() => run(() => toggleClubPostPin(p.id))}
                        className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-950/40">
                        {p.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                      </button>
                    )}
                    {(canManage || p.authorId === viewerId) && (
                      <button type="button" title="Xoá bài" disabled={busy} onClick={() => run(() => deleteClubPost(p.id))}
                        className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </span>
                </div>

                {/* Thích + số bình luận */}
                <div className="mt-2 flex items-center gap-3 border-t border-ink-100 pt-2 dark:border-ink-800">
                  <button type="button" disabled={busy || !canPost} onClick={() => run(() => toggleClubPostLike(p.id))}
                    title={canPost ? undefined : 'Vào nhóm để thích bài'}
                    className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors disabled:opacity-60',
                      p.liked ? 'text-rose-500' : 'text-ink-500 hover:text-rose-500')}>
                    <Heart size={15} className={p.liked ? 'fill-current' : undefined} />
                    {p.likeCount > 0 && fmtCount(p.likeCount)}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-ink-500">
                    <MessageCircle size={15} /> {fmtCount(p.commentCount)}
                  </span>
                </div>

                {/* Bình luận: cây nhiều tầng, mỗi tầng trả lời được */}
                <ClubComments
                  postId={p.id}
                  comments={p.comments}
                  canReply={canPost}
                  canManage={canManage}
                  viewerId={viewerId}
                  header={hidden > 0 ? (
                    <Link href={`/clb/${clubSlug}?bl=${p.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                      Xem tất cả {fmtCount(p.commentCount)} bình luận
                    </Link>
                  ) : null}
                  footer={expandId === p.id && p.commentCount > CLUB_COMMENTS_SHOWN ? (
                    <Link href={`/clb/${clubSlug}`} className="text-xs font-semibold text-ink-500 hover:underline">
                      Thu gọn bình luận
                    </Link>
                  ) : null}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
