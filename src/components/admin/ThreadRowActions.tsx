'use client';

import { useTransition } from 'react';
import { Check, EyeOff, Pin, Lock, LockOpen, Send, Trash2 } from 'lucide-react';
import { setThreadStatus, toggleThreadPinned, toggleThreadLocked, deleteThread } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type Props = { id: string; status: string; pinned: boolean; locked: boolean };

export function ThreadRowActions({ id, status, pinned, locked }: Props) {
  const [pending, start] = useTransition();

  const Btn = ({ onClick, title, className, children }: { onClick: () => void; title: string; className?: string; children: React.ReactNode }) => (
    <button type="button" title={title} disabled={pending} onClick={onClick}
      className={cn('grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800', className)}>
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {status === 'PENDING' && (
        <Btn title="Duyệt & đăng" className="!border-emerald-300 !text-emerald-600 hover:!bg-emerald-50 dark:!border-emerald-800 dark:hover:!bg-emerald-950"
          onClick={() => start(() => setThreadStatus(id, 'PUBLISHED'))}><Check size={15} /></Btn>
      )}
      {status === 'PUBLISHED' ? (
        <Btn title="Ẩn chủ đề" onClick={() => start(() => setThreadStatus(id, 'HIDDEN'))}><EyeOff size={15} /></Btn>
      ) : status !== 'PENDING' ? (
        <Btn title="Hiện lại" onClick={() => start(() => setThreadStatus(id, 'PUBLISHED'))}><Send size={15} /></Btn>
      ) : null}

      <Btn title={pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
        className={pinned ? '!border-amber-300 !text-amber-500 hover:!bg-amber-50 dark:!border-amber-800 dark:hover:!bg-amber-950' : ''}
        onClick={() => start(() => toggleThreadPinned(id))}><Pin size={15} className={pinned ? 'fill-current' : ''} /></Btn>

      <Btn title={locked ? 'Mở khoá trả lời' : 'Khoá trả lời'}
        className={locked ? '!border-sky-300 !text-sky-600 hover:!bg-sky-50 dark:!border-sky-800 dark:hover:!bg-sky-950' : ''}
        onClick={() => start(() => toggleThreadLocked(id))}>{locked ? <Lock size={15} /> : <LockOpen size={15} />}</Btn>

      <Btn title="Xoá" className="!border-rose-300 !text-rose-600 hover:!bg-rose-50 dark:!border-rose-800 dark:hover:!bg-rose-950"
        onClick={() => { if (confirm('Xoá chủ đề này cùng toàn bộ trả lời? Không thể hoàn tác.')) start(() => deleteThread(id)); }}><Trash2 size={15} /></Btn>
    </div>
  );
}
