'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteOwnPost } from '@/app/(site)/user/posts/actions';

export function MyPostActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link href={`/user/posts/${id}/edit`} title="Sửa bài"
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
        <Pencil size={14} />
      </Link>
      <button type="button" disabled={pending} title="Xoá bài"
        onClick={() => { if (confirm('Xoá bài viết này? Không thể hoàn tác.')) start(() => deleteOwnPost(id)); }}
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
