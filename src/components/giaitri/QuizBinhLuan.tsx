'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Eye, Send } from 'lucide-react';
import {
  doiTrangThaiBinhLuan, guiBinhLuan, type BinhLuanState,
} from '@/app/(site)/giai-tri/trac-nghiem/actions';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { QUIZ_BINH_LUAN_MAX } from '@/lib/quiz-const';
import { cn, fmtAgo } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export interface QuizBinhLuanView {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date;
  author: AuthorChip | null;
}

/** Ô soạn bình luận. Chỉ hiện khi người xem đã đủ điều kiện bình luận. */
function OSoan({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [state, action, dangGui] = useActionState<BinhLuanState, FormData>(guiBinhLuan, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-1.5">
      <input type="hidden" name="questionId" value={questionId} />
      <textarea name="noiDung" rows={2} required maxLength={QUIZ_BINH_LUAN_MAX}
        placeholder="Viết bình luận… đừng gợi ý đáp án cho người chưa trả lời."
        className="input resize-y text-sm" />
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-red-600">{state.error}</span>
        <button type="submit" disabled={dangGui} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
          <Send size={14} /> {dangGui ? 'Đang gửi…' : 'Gửi'}
        </button>
      </div>
    </form>
  );
}

/** Một bình luận, kèm nút ẩn/phục hồi cho điều hành viên. */
function Dong({ c, dieuHanh }: { c: QuizBinhLuanView; dieuHanh: boolean }) {
  const router = useRouter();
  const [dangChay, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  const doi = () => {
    setLoi(null);
    start(async () => {
      const r = await doiTrangThaiBinhLuan(c.id, !c.hidden);
      if (r.error) setLoi(r.error);
      else router.refresh();
    });
  };

  return (
    <li className={cn(
      'flex items-start gap-2 rounded-xl p-2',
      c.hidden && 'bg-rose-50/70 dark:bg-rose-950/30',
    )}>
      <Avatar image={c.author?.image ?? null} name={c.author?.name ?? c.author?.username ?? '?'}
        cosmetics={c.author?.cosmetics} size={26} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-xs">
          {c.author && (
            <UserName username={c.author.username} name={c.author.name} role={c.author.role}
              level={c.author.level} cosmetics={c.author.cosmetics} />
          )}
          <span className="text-ink-400">· {fmtAgo(c.createdAt)}</span>
          {c.hidden && <span className="font-semibold text-rose-600">· đã bị ẩn</span>}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700 dark:text-ink-200">
          {c.content}
        </p>
        {loi && <p className="mt-0.5 text-xs text-red-600">{loi}</p>}
      </div>

      {dieuHanh && (
        <button type="button" onClick={doi} disabled={dangChay}
          className="shrink-0 rounded-lg p-1 text-ink-400 hover:text-rose-600 disabled:opacity-50"
          title={c.hidden ? 'Phục hồi bình luận' : 'Ẩn bình luận'}>
          {c.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      )}
    </li>
  );
}

/**
 * Khối bình luận dưới một câu hỏi.
 *
 * Bình luận bị ẩn KHÔNG bị lọc ở đây — người thường không hề nhận được nó từ
 * máy chủ. Cái `hidden` bày ra trong danh sách này chỉ điều hành viên mới thấy,
 * để họ đọc rồi quyết định phục hồi hay để yên.
 */
export function QuizBinhLuan({ questionId, items, duocBinhLuan, dieuHanh, vuong }: {
  questionId: string;
  items: QuizBinhLuanView[];
  duocBinhLuan: boolean;
  dieuHanh: boolean;
  /** Vì sao chưa được bình luận — hiện thay cho ô soạn. */
  vuong?: string;
}) {
  return (
    <div className="space-y-3">
      {duocBinhLuan
        ? <OSoan questionId={questionId} />
        : vuong && <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-800/50">{vuong}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-ink-400">Chưa có bình luận nào.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => <Dong key={c.id} c={c} dieuHanh={dieuHanh} />)}
        </ul>
      )}
    </div>
  );
}
