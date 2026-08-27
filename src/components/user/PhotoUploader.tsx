'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { addPhoto, deletePhoto, setAlbumCover, type AlbumState } from '@/app/(site)/u/[username]/album/actions';
import { ActionForm } from '@/components/ActionForm';
import { CAPTION_MAX } from '@/lib/album-const';

/**
 * Chọn ảnh từ máy, tải lên, rồi gắn vào album.
 *
 * Hai bước tách rời: tải tệp lên qua /api/upload trước, có đường dẫn rồi mới
 * gọi server action gắn vào album. Nhét cả tệp vào server action thì mỗi lần
 * kiểm tra trượt là người dùng phải chọn lại ảnh từ đầu.
 */
export function PhotoUploader({ albumId }: { albumId: string }) {
  const [state, action, pending] = useActionState<AlbumState, FormData>(addPhoto, {});
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    setUrl(null);
    formRef.current?.reset();
    router.refresh();
  }, [state.ok, router]);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) { setUploadError(data.error ?? 'Không tải được ảnh.'); return; }
      setUrl(data.url);
    } catch {
      setUploadError('Không tải được ảnh, thử lại nhé.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <ActionForm ref={formRef} action={action} className="card space-y-3 p-4">
      <input type="hidden" name="albumId" value={albumId} />
      <input type="hidden" name="url" value={url ?? ''} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-outline !py-2 disabled:opacity-60">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {uploading ? 'Đang tải…' : url ? 'Chọn ảnh khác' : 'Chọn ảnh'}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Ảnh vừa chọn" className="size-16 rounded-lg border border-ink-200 object-cover dark:border-ink-700" />
        )}

        <input name="caption" maxLength={CAPTION_MAX} placeholder="Chú thích (không bắt buộc)"
          className="input min-w-40 flex-1" />

        <button type="submit" disabled={pending || !url} className="btn-primary !py-2 disabled:opacity-60">
          {pending ? 'Đang thêm…' : 'Thêm vào album'}
        </button>
      </div>

      {(uploadError || state.error) && (
        <p className="text-sm text-red-600">{uploadError ?? state.error}</p>
      )}
    </ActionForm>
  );
}

/** Nút xoá ảnh và đặt ảnh làm bìa, hiện khi rê chuột lên ảnh. */
export function PhotoActions({ photoId }: { photoId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = async (fn: () => Promise<AlbumState>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (r.error) { setError(r.error); return; }
    router.refresh();
  };

  return (
    <>
      <span className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" disabled={busy} title="Đặt làm bìa album"
          onClick={() => void run(() => setAlbumCover(photoId))}
          className="grid size-7 place-items-center rounded-lg bg-black/55 text-white hover:bg-black/75 disabled:opacity-50">
          <Star size={14} />
        </button>
        <button type="button" disabled={busy} title="Xoá ảnh"
          onClick={() => { if (confirm('Xoá ảnh này?')) void run(() => deletePhoto(photoId)); }}
          className="grid size-7 place-items-center rounded-lg bg-black/55 text-white hover:bg-rose-600 disabled:opacity-50">
          <Trash2 size={14} />
        </button>
      </span>
      {error && <span className="absolute inset-x-1 bottom-1 rounded bg-red-600 px-1 text-[11px] text-white">{error}</span>}
    </>
  );
}
