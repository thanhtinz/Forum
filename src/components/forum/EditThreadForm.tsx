'use client';

import { useActionState } from 'react';
import { Save, PenLine } from 'lucide-react';
import { updateThread, type ThreadState } from '@/app/(site)/forum/actions';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { ActionForm } from '@/components/ActionForm';

export function EditThreadForm({ threadId, title, content }: { threadId: string; title: string; content: string }) {
  const [state, action, pending] = useActionState<ThreadState, FormData>(updateThread, {});

  return (
    <ActionForm action={action} className="card space-y-4 p-5">
      <div className="flex items-center gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50"><PenLine size={18} /></span>
        <div>
          <h1 className="text-lg font-bold">Sửa chủ đề</h1>
          <p className="text-xs text-ink-400">Cập nhật tiêu đề và nội dung bài mở đầu.</p>
        </div>
      </div>

      <input type="hidden" name="threadId" value={threadId} />

      <div>
        <label htmlFor="thread-title" className="mb-1 block text-sm font-medium">Tiêu đề</label>
        <input id="thread-title" name="title" required minLength={5} maxLength={200} defaultValue={title} className="input" />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Nội dung</span>
        <BBCodeEditor name="content" required minLength={10} rows={10} defaultValue={content} />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>}

      <div className="flex justify-end border-t border-ink-100 pt-3 dark:border-ink-800">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <Save size={16} /> {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </ActionForm>
  );
}
