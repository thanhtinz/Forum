'use client';

import { useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Quote, Code2, Link2, Image as ImageIcon,
  List, AlignCenter, EyeOff, Palette, Eye, HelpCircle, Loader2, ImagePlus,
} from 'lucide-react';
import { bbcodeToHtml } from '@/lib/bbcode';
import { cn } from '@/lib/utils';
import { MediaPicker } from '@/components/forum/MediaPicker';

interface ToolButton {
  icon: typeof Bold;
  title: string;
  /** Bọc vùng chọn bằng [tag]…[/tag] */
  wrap?: string;
  /** Chèn nguyên mẫu, `|` là vị trí đặt con trỏ */
  insert?: string;
  /** Hỏi giá trị rồi bọc: [tag=giá trị]…[/tag] */
  prompt?: { tag: string; label: string; placeholder: string };
}

const TOOLS: ToolButton[] = [
  { icon: Bold, title: 'Đậm', wrap: 'b' },
  { icon: Italic, title: 'Nghiêng', wrap: 'i' },
  { icon: Underline, title: 'Gạch chân', wrap: 'u' },
  { icon: Strikethrough, title: 'Gạch ngang', wrap: 's' },
  { icon: Palette, title: 'Màu chữ', prompt: { tag: 'color', label: 'Nhập mã màu', placeholder: '#e5484d' } },
  { icon: AlignCenter, title: 'Căn giữa', wrap: 'center' },
  { icon: Link2, title: 'Chèn liên kết', prompt: { tag: 'url', label: 'Nhập địa chỉ liên kết', placeholder: 'https://' } },
  { icon: ImageIcon, title: 'Ảnh từ liên kết', insert: '[img]|[/img]' },
  { icon: Quote, title: 'Trích dẫn', wrap: 'quote' },
  { icon: Code2, title: 'Mã nguồn', wrap: 'code' },
  { icon: List, title: 'Danh sách', insert: '[list]\n[*]|\n[*]\n[/list]' },
  { icon: EyeOff, title: 'Ẩn nội dung (spoiler)', wrap: 'spoiler' },
];

export interface BBCodeEditorProps {
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  /** Hiện nút emoji/sticker/GIF và nút tải ảnh. */
  media?: boolean;
}

/** Ô soạn thảo BBCode: thanh công cụ, xem trước và chèn ảnh/emoji. */
export function BBCodeEditor({
  name, defaultValue = '', rows = 10, required, minLength, maxLength, placeholder, media = true,
}: BBCodeEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const [help, setHelp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const apply = (fn: (sel: string) => { text: string; caret?: number }) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const sel = ta.value.slice(start, end);
    const { text, caret } = fn(sel);
    const next = ta.value.slice(0, start) + text + ta.value.slice(end);
    setValue(next);
    ta.value = next;
    const pos = caret != null ? start + caret : start + text.length;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
  };

  const run = (t: ToolButton) => {
    if (t.wrap) return apply((sel) => ({ text: `[${t.wrap}]${sel}[/${t.wrap}]`, caret: sel ? undefined : t.wrap!.length + 2 }));
    if (t.prompt) {
      const v = window.prompt(t.prompt.label, t.prompt.placeholder);
      if (!v) return;
      return apply((sel) => ({ text: `[${t.prompt!.tag}=${v}]${sel || 'nội dung'}[/${t.prompt!.tag}]` }));
    }
    if (t.insert) {
      const caret = t.insert.indexOf('|');
      return apply(() => ({ text: t.insert!.replace('|', ''), caret: caret >= 0 ? caret : undefined }));
    }
  };

  const insertRaw = (text: string) => apply(() => ({ text }));

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setUploadError(j.error ?? 'Tải ảnh thất bại.'); return; }
      insertRaw(`\n[img]${j.url}[/img]\n`);
    } catch {
      setUploadError('Không tải được ảnh, vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-200 bg-ink-50 p-1.5 dark:border-ink-700 dark:bg-ink-800/60">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.title} type="button" title={t.title} onClick={() => run(t)}
              className="grid size-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-white hover:text-brand-600 dark:hover:bg-ink-700">
              <Icon size={16} />
            </button>
          );
        })}

        {media && (
          <>
            <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />
            <MediaPicker
              onPickText={(t) => insertRaw(t)}
              onPickImage={(url) => insertRaw(`\n[img]${url}[/img]\n`)}
            />
            <button type="button" title="Tải ảnh lên" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="grid size-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-white hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-700">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          </>
        )}

        <span className="ml-auto flex items-center gap-0.5">
          <button type="button" title="Cú pháp BBCode" onClick={() => setHelp((v) => !v)}
            className={cn('grid size-8 place-items-center rounded-lg transition-colors',
              help ? 'bg-white text-brand-600 dark:bg-ink-700' : 'text-ink-500 hover:bg-white dark:hover:bg-ink-700')}>
            <HelpCircle size={16} />
          </button>
          <button type="button" onClick={() => setPreview((v) => !v)}
            className={cn('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
              preview ? 'bg-brand-500 text-white' : 'text-ink-500 hover:bg-white dark:hover:bg-ink-700')}>
            <Eye size={15} /> Xem trước
          </button>
        </span>
      </div>

      {help && (
        <div className="border-b border-ink-100 bg-white px-3 py-2 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900">
          <code className="font-mono">[b]đậm[/b] · [i]nghiêng[/i] · [u]gạch chân[/u] · [s]gạch ngang[/s] · [quote]trích dẫn[/quote] · [code]mã[/code] · [spoiler]ẩn[/spoiler] · [url=https://…]chữ[/url] · [img]link ảnh[/img] · [color=#e5484d]màu[/color] · [center]giữa[/center] · [list][*]mục[/list]</code>
        </div>
      )}

      {preview ? (
        <div className="min-h-[160px] bg-white p-4 dark:bg-ink-900">
          {value.trim() ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-img:max-h-80 prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: bbcodeToHtml(value) }} />
          ) : (
            <p className="text-sm text-ink-400">Chưa có nội dung để xem trước.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref} name={name} defaultValue={defaultValue} rows={rows}
          required={required} minLength={minLength} maxLength={maxLength} placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="block w-full resize-y border-0 bg-white p-3 text-sm outline-none dark:bg-ink-900"
        />
      )}

      {uploadError && <p className="border-t border-ink-100 px-3 py-1.5 text-xs text-red-600 dark:border-ink-800">{uploadError}</p>}
    </div>
  );
}
