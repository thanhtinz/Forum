'use client';

import { useState } from 'react';
import { Plus, Trash2, Download, KeyRound, Hash } from 'lucide-react';

export interface DownloadDraft {
  label: string;
  url: string;
  provider: string;
  version: string;
  sizeMb: string;
  password: string;
  extractCode: string;
}

const EMPTY: DownloadDraft = { label: '', url: '', provider: '', version: '', sizeMb: '', password: '', extractCode: '' };

const PROVIDERS = [
  { v: '', label: '— Chọn nguồn —' },
  { v: 'local', label: 'Máy chủ Nova' },
  { v: 'gdrive', label: 'Google Drive' },
  { v: 'onedrive', label: 'OneDrive' },
  { v: 'mega', label: 'MEGA' },
  { v: 'fshare', label: 'Fshare' },
  { v: 'other', label: 'Khác' },
];

/**
 * Trình quản lý tệp tải xuống cho bài viết.
 * Gửi lên server dưới dạng JSON trong input ẩn `downloads`.
 */
export function DownloadsEditor({ initial }: { initial?: DownloadDraft[] }) {
  const [items, setItems] = useState<DownloadDraft[]>(initial ?? []);

  const update = (i: number, patch: Partial<DownloadDraft>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <input type="hidden" name="downloads" value={JSON.stringify(items.filter((i) => i.label.trim() && i.url.trim()))} />

      {items.length === 0 && (
        <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-sm text-ink-500 dark:bg-ink-800/50">
          Chưa có tệp nào. Thêm tệp để người xem tải về khi đủ quyền.
        </p>
      )}

      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
              <Download size={15} className="text-green-500" /> Tệp {i + 1}
            </span>
            <button type="button" onClick={() => remove(i)} title="Xoá tệp"
              className="grid size-7 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-ink-500">Tên tệp *</span>
              <input value={it.label} onChange={(e) => update(i, { label: e.target.value })}
                className="input" placeholder="Ví dụ: Nova-UI-Kit-v2.zip" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-ink-500">Liên kết tải *</span>
              <input value={it.url} onChange={(e) => update(i, { url: e.target.value })}
                className="input" placeholder="https://… (chỉ người đã mở khoá thấy được)" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Nguồn lưu trữ</span>
              <select value={it.provider} onChange={(e) => update(i, { provider: e.target.value })} className="input">
                {PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Phiên bản</span>
              <input value={it.version} onChange={(e) => update(i, { version: e.target.value })}
                className="input" placeholder="v1.0" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Dung lượng (MB)</span>
              <input value={it.sizeMb} onChange={(e) => update(i, { sizeMb: e.target.value })}
                type="number" min={0} step="0.1" className="input" placeholder="46" />
            </label>
            <label className="block">
              <span className="mb-1 block flex items-center gap-1 text-xs font-medium text-ink-500"><KeyRound size={11} /> Mật khẩu giải nén</span>
              <input value={it.password} onChange={(e) => update(i, { password: e.target.value })}
                className="input" placeholder="Không bắt buộc" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block flex items-center gap-1 text-xs font-medium text-ink-500"><Hash size={11} /> Mã trích xuất</span>
              <input value={it.extractCode} onChange={(e) => update(i, { extractCode: e.target.value })}
                className="input" placeholder="Mã lấy file của netdisk (không bắt buộc)" />
            </label>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setItems((p) => [...p, { ...EMPTY }])}
        className="btn-ghost !px-3 !py-2 text-sm">
        <Plus size={15} /> Thêm tệp tải xuống
      </button>
    </div>
  );
}
