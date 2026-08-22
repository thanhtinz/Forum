'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { MoreHorizontal, Pencil, Lock, Unlock, Trash2 } from 'lucide-react';
import { toggleOwnThreadLock, deleteOwnThread } from '@/app/(site)/forum/actions';

/** Menu dành cho người đăng chủ đề: sửa, tự khoá/mở, xoá. */
export function ThreadOwnerMenu({ threadId, slug, locked }: { threadId: string; slug: string; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else setOpen(false);
    });

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} title="Tuỳ chọn của bạn"
        className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800">
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-xl dark:border-ink-700 dark:bg-ink-900">
          <Link href={`/forum/${slug}/${threadId}/edit`} onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">
            <Pencil size={15} /> Sửa chủ đề
          </Link>

          <button type="button" disabled={pending} onClick={() => run(() => toggleOwnThreadLock(threadId))}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 disabled:opacity-50 dark:text-ink-300 dark:hover:bg-ink-800">
            {locked ? <><Unlock size={15} /> Mở lại thảo luận</> : <><Lock size={15} /> Đóng thảo luận</>}
          </button>

          <button type="button" disabled={pending}
            onClick={() => { if (confirm('Xoá chủ đề này cùng toàn bộ trả lời? Không thể hoàn tác.')) run(() => deleteOwnThread(threadId)); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40">
            <Trash2 size={15} /> Xoá chủ đề
          </button>

          {error && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
