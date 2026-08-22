'use client';

import { useActionState } from 'react';
import { PenLine } from 'lucide-react';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { createThread, type ThreadState } from '@/app/(site)/forum/actions';
import { ActionForm } from '@/components/ActionForm';

export function NewThreadForm({ forumSlug }: { forumSlug: string }) {
  const [state, action, pending] = useActionState<ThreadState, FormData>(createThread, {});

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="forumSlug" value={forumSlug} />

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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <PenLine size={16} /> {pending ? 'Đang đăng…' : 'Đăng chủ đề'}
        </button>
      </div>
    </ActionForm>
  );
}
