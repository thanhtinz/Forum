'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAlbum } from '@/app/(site)/u/[username]/album/actions';

/** Xoá cả album — hỏi lại vì thao tác này kéo theo toàn bộ ảnh bên trong. */
export function DeleteAlbumButton({ id, username, name }: {
  id: string; username: string; name: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending}
        onClick={() => {
          if (!confirm(`Xoá album “${name}” cùng toàn bộ ảnh trong đó?`)) return;
          setError(null);
          start(async () => {
            const r = await deleteAlbum(id);
            if (r.error) { setError(r.error); return; }
            router.push(`/u/${username}/album`);
          });
        }}
        className="btn-outline !py-1.5 text-sm text-rose-600 disabled:opacity-60 dark:text-rose-400">
        <Trash2 size={15} /> {pending ? 'Đang xoá…' : 'Xoá album'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
