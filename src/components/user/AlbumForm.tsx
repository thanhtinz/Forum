'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Pencil, Plus, X } from 'lucide-react';
import { saveAlbum, type AlbumState } from '@/app/(site)/u/[username]/album/actions';
import { ActionForm } from '@/components/ActionForm';
import {
  ALBUM_NAME_MAX, ALBUM_DESC_MAX, PRIVACIES, PRIVACY_LABELS, type AlbumCard,
} from '@/lib/album-const';

/**
 * Tạo album mới hoặc sửa album sẵn có.
 *
 * Cả hai kiểu đều thu lại sau một nút: album là thứ thỉnh thoảng mới sửa, để
 * sẵn cả biểu mẫu thì phần đáng xem — chính là ảnh — bị đẩy xuống dưới.
 */
export function AlbumForm({ initial, onDone }: { initial?: AlbumCard; onDone?: () => void }) {
  const [state, action, pending] = useActionState<AlbumState, FormData>(saveAlbum, {});
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    setOpen(false);
    onDone?.();
    router.refresh();
  }, [state.ok, onDone, router]);

  if (!open) {
    return initial ? (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline !py-2">
        <Pencil size={15} /> Sửa album
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary !py-2">
        <Plus size={16} /> Tạo album
      </button>
    );
  }

  return (
    <ActionForm action={action} className="card space-y-3 p-4 sm:p-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="album-name" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Tên album
        </label>
        <input id="album-name" name="name" required maxLength={ALBUM_NAME_MAX}
          defaultValue={initial?.name ?? ''} placeholder="Ví dụ: Kỷ niệm cấp ba" className="input" />
      </div>

      <div>
        <label htmlFor="album-desc" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Mô tả <span className="font-normal normal-case text-ink-400">(không bắt buộc)</span>
        </label>
        <input id="album-desc" name="description" maxLength={ALBUM_DESC_MAX}
          defaultValue={initial?.description ?? ''} className="input" />
      </div>

      <fieldset>
        <legend className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Ai được xem</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRIVACIES.map((p) => (
            <label key={p} className="cursor-pointer" title={PRIVACY_LABELS[p].hint}>
              <input type="radio" name="privacy" value={p}
                defaultChecked={p === (initial?.privacy ?? 'PUBLIC')} className="peer sr-only" />
              <span className={`chip ${PRIVACY_LABELS[p].chip} peer-checked:ring-2 peer-checked:ring-brand-500`}>
                {PRIVACY_LABELS[p].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-2 disabled:opacity-60">
          <ImagePlus size={15} /> {pending ? 'Đang lưu…' : initial ? 'Lưu album' : 'Tạo album'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-2">
          <X size={15} /> Huỷ
        </button>
        <span className="min-w-0 flex-1 truncate text-xs">
          {state.error && <span className="text-red-600">{state.error}</span>}
        </span>
      </div>
    </ActionForm>
  );
}
