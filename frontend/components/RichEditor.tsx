'use client';

import { useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading, Link as LinkIcon,
  Quote, Code, List, Image as ImageIcon, Eye, EyeOff,
} from 'lucide-react';
import { uploadEditorImage } from '@/lib/api';

type Mode = 'markdown' | 'bbcode';

interface RichEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// Cú pháp bao quanh phần văn bản đang chọn, theo từng chế độ.
type WrapDef = { before: string; after: string };

export default function RichEditor({ value, onChange, placeholder, minHeight = 180 }: RichEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('markdown');
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Bao quanh vùng chọn bằng before/after, giữ focus và đặt lại con trỏ.
  function wrap(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  // Chèn text tại vị trí con trỏ (thay thế vùng chọn nếu có).
  function insertAtCursor(text: string) {
    const el = ref.current;
    if (!el) {
      onChange(value + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // Bảng cú pháp theo chế độ.
  const md: Record<string, WrapDef> = {
    bold: { before: '**', after: '**' },
    italic: { before: '*', after: '*' },
    underline: { before: '<u>', after: '</u>' },
    strike: { before: '~~', after: '~~' },
    heading: { before: '## ', after: '' },
    quote: { before: '> ', after: '' },
    code: { before: '`', after: '`' },
    list: { before: '- ', after: '' },
  };
  const bb: Record<string, WrapDef> = {
    bold: { before: '[b]', after: '[/b]' },
    italic: { before: '[i]', after: '[/i]' },
    underline: { before: '[u]', after: '[/u]' },
    strike: { before: '[s]', after: '[/s]' },
    heading: { before: '[size=18]', after: '[/size]' },
    quote: { before: '[quote]', after: '[/quote]' },
    code: { before: '[code]', after: '[/code]' },
    list: { before: '[list]\n[*]', after: '\n[/list]' },
  };
  const syn = mode === 'markdown' ? md : bb;

  function apply(key: string) {
    const d = syn[key];
    if (d) wrap(d.before, d.after);
  }

  function insertLink() {
    const el = ref.current;
    const sel = el ? value.slice(el.selectionStart, el.selectionEnd) : '';
    const url = window.prompt('Nhập đường dẫn liên kết:', 'https://');
    if (!url) return;
    const text = sel || 'liên kết';
    if (mode === 'markdown') insertAtCursor(`[${text}](${url})`);
    else insertAtCursor(`[url=${url}]${text}[/url]`);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadEditorImage(file);
      if (mode === 'markdown') insertAtCursor(`![](${url})`);
      else insertAtCursor(`[img]${url}[/img]`);
    } catch (err: any) {
      window.alert('Tải ảnh thất bại: ' + (err?.message || 'lỗi không xác định'));
    } finally {
      setUploading(false);
    }
  }

  const btn = 'rounded-md p-1.5 text-ink-600 hover:bg-ink-100 disabled:opacity-50 dark:text-ink-300 dark:hover:bg-ink-800';

  return (
    <div className="card overflow-hidden">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-200/70 p-1.5 dark:border-ink-800">
        <button type="button" className={btn} title="Đậm" onClick={() => apply('bold')}><Bold size={16} /></button>
        <button type="button" className={btn} title="Nghiêng" onClick={() => apply('italic')}><Italic size={16} /></button>
        <button type="button" className={btn} title="Gạch chân" onClick={() => apply('underline')}><Underline size={16} /></button>
        <button type="button" className={btn} title="Gạch ngang" onClick={() => apply('strike')}><Strikethrough size={16} /></button>
        <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />
        <button type="button" className={btn} title="Tiêu đề" onClick={() => apply('heading')}><Heading size={16} /></button>
        <button type="button" className={btn} title="Liên kết" onClick={insertLink}><LinkIcon size={16} /></button>
        <button type="button" className={btn} title="Trích dẫn" onClick={() => apply('quote')}><Quote size={16} /></button>
        <button type="button" className={btn} title="Mã" onClick={() => apply('code')}><Code size={16} /></button>
        <button type="button" className={btn} title="Danh sách" onClick={() => apply('list')}><List size={16} /></button>
        <button type="button" className={btn} title="Chèn ảnh" disabled={uploading} onClick={() => fileRef.current?.click()}><ImageIcon size={16} /></button>
        {uploading && <span className="ml-1 text-xs text-ink-500">Đang tải ảnh…</span>}

        <span className="ml-auto flex items-center gap-1">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            title="Chế độ soạn thảo"
            className="rounded-md border border-ink-200 bg-transparent px-2 py-1 text-xs dark:border-ink-700"
          >
            <option value="markdown">Markdown</option>
            <option value="bbcode">BBCode</option>
          </select>
          <button
            type="button"
            className={`${btn} flex items-center gap-1 text-xs`}
            title="Xem trước"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <EyeOff size={16} /> : <Eye size={16} />}
            {preview ? 'Soạn thảo' : 'Xem trước'}
          </button>
        </span>
      </div>

      {preview ? (
        <div className="p-3" style={{ minHeight }}>
          <p className="mb-2 text-xs text-ink-400">Xem trước cơ bản — hiển thị đầy đủ sau khi đăng.</p>
          {value.trim() ? (
            <pre className="prose prose-sm max-w-none whitespace-pre-wrap break-words font-sans dark:prose-invert">{value}</pre>
          ) : (
            <p className="text-sm text-ink-400">{placeholder || 'Chưa có nội dung.'}</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full resize-y border-0 bg-transparent p-3 text-sm outline-none focus:ring-0"
        />
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
    </div>
  );
}
