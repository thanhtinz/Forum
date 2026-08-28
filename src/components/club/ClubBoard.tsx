'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2 } from 'lucide-react';
import { postToClub, deleteClubPost } from '@/app/(site)/clb/actions';
import { UserName, Avatar } from '@/components/user/Cosmetic';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { CLUB_POST_MAX, type ClubActionState } from '@/lib/club-const';
import { fmtAgo } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export interface ClubPostView {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: AuthorChip | null;
}

/** Bảng tin câu lạc bộ: ô soạn ở trên, bài mới nhất ở dưới. */
export function ClubBoard({ clubId, canPost, posts, viewerId, isOwner }: {
  clubId: string;
  canPost: boolean;
  posts: ClubPostView[];
  viewerId: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [state, action, sending] = useActionState<ClubActionState, FormData>(postToClub, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [seq, setSeq] = useState(0);
  const [busy, startDelete] = useTransition();
  const [delError, setDelError] = useState<string | null>(null);

  // Đăng xong thì dọn ô soạn và lấy lại danh sách. `seq` đổi làm React dựng ô
  // soạn mới — ô soạn giữ nội dung trong state của chính nó nên không tự trống.
  useEffect(() => {
    if (state.ok) { setSeq((s) => s + 1); router.refresh(); }
  }, [state, router]);

  const remove = (id: string) => {
    setDelError(null);
    startDelete(async () => {
      const r = await deleteClubPost(id);
      if (r.error) { setDelError(r.error); return; }
      router.refresh();
    });
  };

  return (
    <section>
      {canPost && (
        <form ref={formRef} action={action} className="card mb-4 p-3.5">
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

      {delError && <p className="mb-2 text-sm text-red-600">{delError}</p>}

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">
          Bảng tin còn trống. {canPost ? 'Đăng bài đầu tiên đi!' : 'Vào nhóm để cùng đăng bài.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="card p-3.5">
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
                {(isOwner || p.authorId === viewerId) && (
                  <button type="button" title="Xoá bài" disabled={busy} onClick={() => remove(p.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
