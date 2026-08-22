'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sticker, Upload, Trash2, Eye, EyeOff, Loader2, FileArchive } from 'lucide-react';
import { deleteStickerPack, toggleStickerPack } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

export interface PackRow {
  id: string;
  name: string;
  active: boolean;
  count: number;
  preview: { id: string; url: string; name: string }[];
}

export function StickerPackManager({ packs }: { packs: PackRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string; skipped?: string[] } | null>(null);
  const [pending, start] = useTransition();

  const submit = async () => {
    if (!name.trim()) { setMsg({ error: 'Hãy đặt tên cho bộ sticker.' }); return; }
    if (!file) { setMsg({ error: 'Hãy chọn tệp .zip.' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set('name', name.trim());
      fd.set('file', file);
      const r = await fetch('/api/admin/sticker-pack', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setMsg({ error: j.error ?? 'Tải lên thất bại.', skipped: j.skipped }); return; }
      setMsg({ ok: `Đã tạo bộ “${j.pack.name}” với ${j.pack.count} sticker.`, skipped: j.skipped });
      setName('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch {
      setMsg({ error: 'Không tải lên được, vui lòng thử lại.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <p className="mb-4 flex items-start gap-2 text-sm text-ink-500">
        <Sticker size={16} className="mt-0.5 shrink-0 text-brand-500" />
        <span>
          Tải lên tệp <b>.zip</b> chứa ảnh (PNG, JPG, GIF, WebP, SVG). Mỗi ảnh thành một sticker,
          tên lấy theo tên tệp. Tối đa 20MB mỗi gói, 1MB mỗi ảnh, 60 ảnh mỗi bộ.
        </span>
      </p>

      {/* Khung tải lên */}
      <div className="grid gap-3 rounded-xl border border-dashed border-ink-300 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-ink-700">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên bộ</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ví dụ: Anime Chan" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tệp .zip</span>
          <input ref={fileRef} type="file" accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-ink-200 dark:file:bg-ink-800" />
        </label>
        <button type="button" onClick={submit} disabled={busy} className="btn-primary h-10 disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {busy ? 'Đang tải…' : 'Tải lên'}
        </button>
      </div>

      {msg && (
        <div className="mt-3 space-y-1">
          {msg.error && <p className="text-sm text-red-600">{msg.error}</p>}
          {msg.ok && <p className="text-sm text-green-600">{msg.ok}</p>}
          {msg.skipped && msg.skipped.length > 0 && (
            <details className="text-xs text-ink-400">
              <summary className="cursor-pointer">Bỏ qua {msg.skipped.length} tệp</summary>
              <ul className="mt-1 list-inside list-disc">
                {msg.skipped.slice(0, 20).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Danh sách bộ đã có */}
      <div className="mt-4 space-y-2.5">
        {packs.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Chưa có bộ sticker nào.</p>}
        {packs.map((p) => (
          <div key={p.id} className={cn('rounded-xl border border-ink-200 p-3 dark:border-ink-700', !p.active && 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink-900 dark:text-white">{p.name}</span>
              <span className="text-xs text-ink-400">{p.count} sticker</span>
              {!p.active && <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs text-ink-600 dark:bg-ink-800">Đang ẩn</span>}

              <div className="ml-auto flex items-center gap-1.5">
                <button type="button" disabled={pending} title={p.active ? 'Ẩn bộ này' : 'Hiện bộ này'}
                  onClick={() => start(() => toggleStickerPack(p.id))}
                  className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
                  {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button type="button" disabled={pending} title="Xoá bộ"
                  onClick={() => { if (confirm(`Xoá bộ “${p.name}” cùng toàn bộ ảnh? Không thể hoàn tác.`)) start(() => deleteStickerPack(p.id)); }}
                  className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {p.preview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.preview.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.id} src={s.url} alt={s.name} title={s.name} loading="lazy"
                    className="size-12 rounded-lg border border-ink-100 object-contain dark:border-ink-800" />
                ))}
                {p.count > p.preview.length && (
                  <span className="grid size-12 place-items-center rounded-lg bg-ink-100 text-xs text-ink-500 dark:bg-ink-800">
                    +{p.count - p.preview.length}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
        <FileArchive size={13} /> Mẹo: nén thẳng các ảnh vào zip, hoặc để trong một thư mục cũng được.
      </p>
    </section>
  );
}
