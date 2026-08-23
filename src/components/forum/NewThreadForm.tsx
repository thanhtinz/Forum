'use client';

import { useActionState } from 'react';
import { PenLine, Award } from 'lucide-react';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { createThread, type ThreadState } from '@/app/(site)/forum/actions';
import { ActionForm } from '@/components/ActionForm';
import { PollBuilder } from './PollBuilder';
import { DraftKeeper } from '@/components/DraftKeeper';
import { BOUNTY_MAX, BOUNTY_MIN } from '@/lib/bounty';

export function NewThreadForm({ forumSlug, myPoints }: { forumSlug: string; myPoints: number }) {
  const [state, action, pending] = useActionState<ThreadState, FormData>(createThread, {});

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="forumSlug" value={forumSlug} />
      <DraftKeeper storageKey={`nova:draft:thread:${forumSlug}`} />

      <div>
        <label className="mb-1 block text-sm font-medium">Tiêu đề</label>
        <input name="title" required minLength={5} maxLength={200} placeholder="Nhập tiêu đề chủ đề…" className="input" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nội dung</label>
        <BBCodeEditor name="content" required minLength={10} rows={9}
          placeholder="Chia sẻ chi tiết nội dung, câu hỏi hoặc thảo luận của bạn…" />
        <p className="mt-1 text-xs text-ink-400">Xuống dòng 2 lần để tách đoạn.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Thẻ <span className="text-ink-400">(tuỳ chọn)</span></label>
        <input name="tags" maxLength={120} placeholder="Cách nhau bằng dấu phẩy: hỏi đáp, thủ thuật…" className="input" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          <span className="inline-flex items-center gap-1.5"><Award size={15} className="text-amber-500" /> Treo thưởng</span>
          <span className="text-ink-400"> (tuỳ chọn)</span>
        </label>
        <input name="bounty" type="number" min={BOUNTY_MIN} max={BOUNTY_MAX} step={1}
          placeholder={`Số điểm thưởng cho người có lời giải, từ ${BOUNTY_MIN} điểm`} className="input" />
        <p className="mt-1 text-xs text-ink-400">
          Điểm được giữ lại ngay khi đăng và trả cho người bạn chọn làm lời giải.
          Xoá chủ đề khi chưa chọn lời giải thì được hoàn lại. Bạn đang có <b>{myPoints}</b> điểm.
        </p>
      </div>

      <PollBuilder />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <PenLine size={16} /> {pending ? 'Đang đăng…' : 'Đăng chủ đề'}
        </button>
      </div>
    </ActionForm>
  );
}
