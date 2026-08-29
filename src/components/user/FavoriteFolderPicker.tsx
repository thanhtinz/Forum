'use client';

import { useRef, useState, useTransition } from 'react';
import { FolderInput, Check, Plus } from 'lucide-react';
import { Popover } from '@/components/Popover';
import { moveFavorite } from '@/app/(site)/user/favorites/actions';
import { DEFAULT_FOLDER, FOLDER_MAX_LEN, folderLabel } from '@/lib/favorite-folder';

/**
 * Nút chuyển một mục đã lưu sang thư mục khác.
 *
 * Gõ tên chưa có là tạo thư mục mới luôn — không bắt người dùng sang một trang
 * "quản lý thư mục" rồi mới quay lại.
 */
export function FavoriteFolderPicker({ favoriteId, current, folders }: {
  favoriteId: string;
  current: string;
  folders: string[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const move = (folder: string) => {
    setError(null);
    start(async () => {
      const r = await moveFavorite(favoriteId, folder);
      if (r.error) setError(r.error);
      else { setOpen(false); if (inputRef.current) inputRef.current.value = ''; }
    });
  };

  const options = folders.includes(DEFAULT_FOLDER) ? folders : [DEFAULT_FOLDER, ...folders];

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen((v) => !v)}
        title="Chuyển sang thư mục khác" aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
        <FolderInput size={13} /> {folderLabel(current)}
      </button>

      <Popover open={open} anchor={btnRef.current} onClose={() => setOpen(false)} align="right"
        className="card w-56 overflow-y-auto p-1 shadow-card-hover">
        {options.map((f) => (
          <button key={f} type="button" disabled={pending} onClick={() => move(f)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-100 disabled:opacity-50 dark:hover:bg-ink-800">
            <Check size={14} className={f === current ? 'text-brand-500' : 'invisible'} />
            <span className="min-w-0 flex-1 truncate">{folderLabel(f)}</span>
          </button>
        ))}

        <div className="my-1 border-t border-ink-100 dark:border-ink-800" />

        <form
          className="flex items-center gap-1 p-1"
          onSubmit={(e) => { e.preventDefault(); const v = inputRef.current?.value ?? ''; if (v.trim()) move(v); }}
        >
          <input ref={inputRef} maxLength={FOLDER_MAX_LEN} placeholder="Thư mục mới…"
            className="input min-w-0 flex-1 !py-1.5 !text-sm" />
          <button type="submit" disabled={pending} title="Tạo và chuyển vào" aria-label="Tạo thư mục và chuyển vào"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
            <Plus size={15} />
          </button>
        </form>

        {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
      </Popover>
    </>
  );
}
