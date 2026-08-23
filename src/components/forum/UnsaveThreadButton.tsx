'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BookmarkX } from 'lucide-react';
import { toggleThreadFavorite } from '@/app/(site)/forum/actions';

/** Bỏ lưu ngay trong danh sách, không cần mở lại chủ đề. */
export function UnsaveThreadButton({ threadId, title }: { threadId: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button type="button" disabled={pending} title={`Bỏ lưu “${title}”`}
        onClick={() => start(async () => {
          const r = await toggleThreadFavorite(threadId);
          if (r.error) { setError(r.error); return; }
          router.refresh();
        })}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
        <BookmarkX size={13} /> Bỏ lưu
      </button>
    </div>
  );
}
