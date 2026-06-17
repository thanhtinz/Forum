'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color, FontSize, BackgroundColor } from '@tiptap/extension-text-style';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Mention from '@tiptap/extension-mention';
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import {
  Bold, Italic, Underline, Strikethrough, Code, Quote, Code2,
  List, ListOrdered, ListChecks, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Unlink, Image as ImageIcon, Table as TableIcon,
  Youtube as YoutubeIcon, Minus, Undo2, Redo2, Type, Palette, Highlighter,
  Rows, Columns, Trash2, EyeOff, Sparkles, ChevronDown,
  Eye, Maximize2, Minimize2,
} from 'lucide-react';
import { uploadEditorImage, api } from '@/lib/api';

interface TipTapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autosaveKey?: string;
}

const FONT_SIZES = [12, 14, 16, 18, 24, 32];

// Coi nội dung là rỗng nếu trống hoặc chỉ là đoạn rỗng
function isEmptyHtml(html: string): boolean {
  const t = (html || '').trim();
  return t === '' || t === '<p></p>';
}

// ── @mention + #hashtag ──────────────────────────────────────────────
// Mỗi gợi ý lưu { id, label, href } để renderHTML xuất ra thẻ <a> (sanitizer cho phép <a href class>).

type SuggestItem = {
  id: string;
  label: string;
  href: string;
  secondary?: string; // text phụ: @username hoặc số lượt dùng
  avatar?: string;    // ảnh đại diện (mention người dùng)
  badge?: string;     // nhãn nhỏ, ví dụ "AI"
};

// Tạo extension Mention có thêm thuộc tính `href` và renderHTML xuất ra <a>.
function makeMentionExtension(opts: {
  name: string;            // 'mention' | 'hashtag'
  htmlClass: string;       // class CSS của anchor
  char: string;            // '@' | '#'
  prefixInText: boolean;   // có thêm ký tự char vào trước label trong text/anchor không
  suggestion: Omit<SuggestionOptions, 'editor'>;
}) {
  const Base = opts.name === 'mention' ? Mention : Mention.extend({ name: opts.name });
  return Base
    .extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          href: {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute('href'),
            renderHTML: (attrs: Record<string, any>) =>
              attrs.href ? { href: attrs.href } : {},
          },
        };
      },
      // Xuất node thành thẻ <a href class>@label</a> để qua sanitizer vẫn là liên kết.
      renderHTML({ node, HTMLAttributes }: any) {
        const label = node.attrs.label ?? node.attrs.id ?? '';
        const text = opts.prefixInText ? `${opts.char}${label}` : label;
        const href = node.attrs.href || '#';
        const attrs: Record<string, string> = {
          href,
          class: HTMLAttributes?.class || opts.htmlClass,
          'data-type': opts.name,
          'data-id': node.attrs.id ?? '',
          'data-label': label,
        };
        return ['a', attrs, text];
      },
      parseHTML() {
        return [{ tag: `a[data-type="${opts.name}"]` }];
      },
      renderText({ node }: any) {
        const label = node.attrs.label ?? node.attrs.id ?? '';
        return opts.prefixInText ? `${opts.char}${label}` : label;
      },
    })
    .configure({
      HTMLAttributes: { class: opts.htmlClass },
      suggestion: opts.suggestion,
    });
}

// Dropdown gợi ý bằng DOM thuần (không cần tippy) — hoạt động cả bàn phím lẫn chuột.
function makeSuggestionRender(char: string) {
  return () => {
    let root: HTMLDivElement | null = null;
    let items: SuggestItem[] = [];
    let selected = 0;
    let command: ((item: SuggestItem) => void) | null = null;

    function paint() {
      if (!root) return;
      root.innerHTML = '';
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'tt-suggest-empty';
        empty.textContent = 'Không có kết quả';
        root.appendChild(empty);
        return;
      }
      items.forEach((it, i) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'tt-suggest-item' + (i === selected ? ' is-selected' : '');
        // Icon / avatar
        if (it.avatar) {
          const img = document.createElement('img');
          img.src = it.avatar;
          img.className = 'tt-suggest-avatar';
          img.alt = '';
          row.appendChild(img);
        } else {
          const ic = document.createElement('span');
          ic.className = 'tt-suggest-icon';
          ic.textContent = char;
          row.appendChild(ic);
        }
        const main = document.createElement('span');
        main.className = 'tt-suggest-main';
        const top = document.createElement('span');
        top.className = 'tt-suggest-label';
        top.textContent = it.label;
        if (it.badge) {
          const b = document.createElement('span');
          b.className = 'tt-suggest-badge';
          b.textContent = it.badge;
          top.appendChild(b);
        }
        main.appendChild(top);
        if (it.secondary) {
          const sub = document.createElement('span');
          sub.className = 'tt-suggest-sub';
          sub.textContent = it.secondary;
          main.appendChild(sub);
        }
        row.appendChild(main);
        // Chuột: chọn item. Dùng mousedown để không mất focus editor trước khi command.
        row.addEventListener('mousedown', (e) => {
          e.preventDefault();
          command?.(it);
        });
        row.addEventListener('mouseenter', () => {
          selected = i;
          paint();
        });
        root!.appendChild(row);
      });
    }

    function position(rect: DOMRect | null | undefined) {
      if (!root || !rect) return;
      root.style.top = `${rect.bottom + window.scrollY + 4}px`;
      root.style.left = `${rect.left + window.scrollX}px`;
    }

    return {
      onStart(props: SuggestionProps<SuggestItem, SuggestItem>) {
        items = props.items as SuggestItem[];
        selected = 0;
        command = (item) => props.command(item);
        root = document.createElement('div');
        root.className = 'tt-suggest';
        document.body.appendChild(root);
        paint();
        position(props.clientRect?.());
      },
      onUpdate(props: SuggestionProps<SuggestItem, SuggestItem>) {
        items = props.items as SuggestItem[];
        if (selected >= items.length) selected = 0;
        command = (item) => props.command(item);
        paint();
        position(props.clientRect?.());
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        const key = props.event.key;
        if (key === 'ArrowDown') {
          selected = (selected + 1) % Math.max(items.length, 1);
          paint();
          return true;
        }
        if (key === 'ArrowUp') {
          selected = (selected - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1);
          paint();
          return true;
        }
        if (key === 'Enter') {
          if (items[selected]) {
            command?.(items[selected]);
            return true;
          }
          return false;
        }
        if (key === 'Escape') {
          root?.remove();
          root = null;
          return true;
        }
        return false;
      },
      onExit() {
        root?.remove();
        root = null;
        items = [];
      },
    };
  };
}

// Gợi ý người dùng + nhân vật AI (AI đứng đầu, có nhãn "AI").
const userSuggestion: Omit<SuggestionOptions, 'editor'> = {
  char: '@',
  allowSpaces: false,
  async items({ query }: { query: string }) {
    const q = (query || '').trim();
    const results: SuggestItem[] = [];
    // Nhân vật AI (global personas) — đứng đầu
    try {
      const personas = await api.get<Array<{ id: string; name: string; characterId?: string; live2dModel?: string }>>(
        '/ai/personas',
      );
      const ql = q.toLowerCase();
      personas
        .filter((p) => !q || p.name?.toLowerCase().includes(ql))
        .slice(0, 3)
        .forEach((p) => {
          results.push({
            id: p.id,
            label: p.name,
            href: '/ai',
            badge: 'AI',
            secondary: 'Nhân vật AI',
          });
        });
    } catch { /* bỏ qua nếu lỗi */ }
    // Thành viên
    try {
      const res = await api.get<{
        data: Array<{ id: string; username: string; displayName?: string; avatar?: string; role?: string }>;
      }>(`/social/members?q=${encodeURIComponent(q)}&limit=6`);
      (res?.data || []).forEach((u) => {
        results.push({
          id: u.id,
          label: u.displayName || u.username,
          href: `/profile?u=${encodeURIComponent(u.username)}`,
          secondary: `@${u.username}`,
          avatar: u.avatar,
        });
      });
    } catch { /* bỏ qua nếu lỗi */ }
    return results.slice(0, 9);
  },
  render: makeSuggestionRender('@'),
};

// Gợi ý hashtag.
const tagSuggestion: Omit<SuggestionOptions, 'editor'> = {
  char: '#',
  allowSpaces: false,
  async items({ query }: { query: string }) {
    const q = (query || '').trim();
    try {
      const tags = await api.get<Array<{ id: string; name: string; slug?: string; usageCount?: number }>>(
        `/forum/tags?q=${encodeURIComponent(q)}&limit=6`,
      );
      return (tags || []).map((t) => ({
        id: t.id,
        label: t.name,
        href: `/tags?q=${encodeURIComponent(t.name)}`,
        secondary: typeof t.usageCount === 'number' ? `${t.usageCount} bài` : undefined,
      })) as SuggestItem[];
    } catch {
      return [];
    }
  },
  render: makeSuggestionRender('#'),
};

const MentionUser = makeMentionExtension({
  name: 'mention',
  htmlClass: 'mention',
  char: '@',
  prefixInText: true,
  suggestion: userSuggestion,
});

const MentionTag = makeMentionExtension({
  name: 'hashtag',
  htmlClass: 'hashtag',
  char: '#',
  prefixInText: true,
  suggestion: tagSuggestion,
});

export default function TipTapEditor({ value, onChange, placeholder, autosaveKey }: TipTapEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const aiRef = useRef<HTMLDivElement>(null);

  // XenForo-style UX
  const [preview, setPreview] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [saveState, setSaveState] = useState<'' | 'saving' | 'saved'>('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryHtml, setRecoveryHtml] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = autosaveKey ? `tiptap-draft:${autosaveKey}` : '';

  // Đóng menu AI khi click ra ngoài
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (aiRef.current && !aiRef.current.contains(e.target as Node)) setAiOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontSize,
      BackgroundColor,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: placeholder || 'Viết nội dung…' }),
      CharacterCount,
      MentionUser,
      MentionTag,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      scheduleSave(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length) {
          const image = Array.from(files).find((f) => f.type.startsWith('image/'));
          if (image) {
            event.preventDefault();
            void uploadAndInsert(image);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length) {
          const image = Array.from(files).find((f) => f.type.startsWith('image/'));
          if (image) {
            event.preventDefault();
            void uploadAndInsert(image);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Đồng bộ value từ bên ngoài (ví dụ reset về '' sau khi gửi)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // Khi value bị reset rỗng (đã gửi xong), xoá bản nháp đã lưu
    if (storageKey && isEmptyHtml(value)) {
      try { localStorage.removeItem(storageKey); } catch {}
      setSaveState('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Lưu nháp tự động (debounce ~800ms)
  function scheduleSave(html: string) {
    if (!storageKey) return;
    if (isEmptyHtml(html)) return;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, html);
        setSaveState('saved');
      } catch {
        setSaveState('');
      }
    }, 800);
  }

  // Phát hiện bản nháp chưa lưu khi mở editor (chỉ khi value đang rỗng)
  useEffect(() => {
    if (!editor || !storageKey) return;
    if (!isEmptyHtml(value)) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && !isEmptyHtml(saved)) {
        setRecoveryHtml(saved);
        setShowRecovery(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Dọn timer khi unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Nhấn Esc để thoát toàn màn hình
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFullscreen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  function restoreDraft() {
    if (!editor) return;
    editor.commands.setContent(recoveryHtml, { emitUpdate: false });
    onChange(recoveryHtml);
    setShowRecovery(false);
  }

  function dismissDraft() {
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch {} }
    setShowRecovery(false);
  }

  async function uploadAndInsert(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const { url } = await uploadEditorImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err: any) {
      window.alert('Tải ảnh thất bại: ' + (err?.message || 'lỗi không xác định'));
    } finally {
      setUploading(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadAndInsert(file);
  }

  if (!editor) {
    return <div className="card min-h-[260px] animate-pulse" />;
  }

  const btn = 'rounded-md p-1.5 text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800';
  const active = 'bg-ink-200 text-brand-600 dark:bg-ink-700';
  const cls = (on: boolean) => `${btn} ${on ? active : ''}`;
  const Divider = () => <span className="mx-0.5 h-5 w-px bg-ink-200 dark:bg-ink-700" />;

  function setLink() {
    const prev = editor!.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập đường dẫn liên kết:', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function insertVideo() {
    const url = window.prompt('Nhập đường dẫn video YouTube:', 'https://');
    if (!url) return;
    editor!.commands.setYoutubeVideo({ src: url });
  }

  function insertSpoiler() {
    editor!.chain().focus().insertContent(
      '<details><summary>Spoiler</summary><p>Nội dung ẩn</p></details>'
    ).run();
  }

  // ── Công cụ viết bằng AI ──
  // Lấy văn bản đang chọn, nếu không có thì lấy toàn bộ nội dung
  function getAiInput(): { text: string; hasSelection: boolean } {
    const { from, to } = editor!.state.selection;
    if (from !== to) {
      const sel = editor!.state.doc.textBetween(from, to, '\n').trim();
      if (sel) return { text: sel, hasSelection: true };
    }
    return { text: editor!.getText().trim(), hasSelection: false };
  }

  async function runAi(
    path: string,
    body: Record<string, unknown>,
    mode: 'replace' | 'append',
  ) {
    setAiErr('');
    const { text, hasSelection } = getAiInput();
    if (!text) { setAiErr('Chưa có nội dung để xử lý.'); return; }
    setAiOpen(false);
    setAiBusy(true);
    try {
      const res = await api.post<{ result: string }>(path, { ...body, text });
      const result = (res.result || '').trim();
      if (!result) { setAiErr('AI không trả về nội dung.'); return; }
      if (mode === 'append') {
        editor!.chain().focus().command(({ commands, state }) => {
          return commands.insertContentAt(state.doc.content.size, `<p>${result}</p>`);
        }).run();
      } else if (hasSelection) {
        // insertContent thay thế đoạn đang chọn
        editor!.chain().focus().insertContent(result).run();
      } else {
        editor!.chain().focus().insertContentAt(editor!.state.doc.content.size, `<p>${result}</p>`).run();
      }
    } catch (e: any) {
      setAiErr('AI lỗi: ' + (e?.message || 'không xác định'));
    } finally {
      setAiBusy(false);
    }
  }

  function aiTranslate() {
    const target = window.prompt('Dịch sang ngôn ngữ nào?', 'Tiếng Anh');
    if (target === null) return;
    void runAi('/ai/writing/translate', { target: target || 'Tiếng Anh' }, 'replace');
  }

  const aiMenuItem = 'flex w-full items-center px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700';

  const inTable = editor.isActive('table');

  // Giá trị heading hiện tại cho select
  let headingValue = 'p';
  for (let lvl = 1; lvl <= 6; lvl++) {
    if (editor.isActive('heading', { level: lvl })) { headingValue = `h${lvl}`; break; }
  }

  const currentFontSize = (editor.getAttributes('textStyle').fontSize as string | undefined) || '';

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 overflow-auto bg-white p-4 dark:bg-ink-950' : 'card overflow-hidden'}>
      <div className={fullscreen ? 'card mx-auto flex max-w-4xl flex-col overflow-hidden' : ''}>
      {/* Banner khôi phục bản nháp */}
      {showRecovery && (
        <div className="flex items-center gap-2 border-b border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Có bản nháp chưa lưu.</span>
          <button type="button" onClick={restoreDraft} className="rounded-md bg-amber-500 px-2 py-0.5 font-medium text-white hover:bg-amber-600">Khôi phục</button>
          <button type="button" onClick={dismissDraft} className="rounded-md px-2 py-0.5 font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40">Bỏ</button>
        </div>
      )}
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-200/70 p-1.5 dark:border-ink-800">
        <button type="button" className={cls(editor.isActive('bold'))} title="Đậm" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" className={cls(editor.isActive('italic'))} title="Nghiêng" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <button type="button" className={cls(editor.isActive('underline'))} title="Gạch chân" onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={16} /></button>
        <button type="button" className={cls(editor.isActive('strike'))} title="Gạch ngang" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>

        <Divider />

        {/* Màu chữ */}
        <label className={`${btn} relative flex cursor-pointer items-center`} title="Màu chữ">
          <Palette size={16} />
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </label>
        {/* Màu nền (highlight) */}
        <label className={`${btn} relative flex cursor-pointer items-center`} title="Màu nền chữ">
          <Highlighter size={16} />
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => editor.chain().focus().setBackgroundColor(e.target.value).run()} />
        </label>

        {/* Cỡ chữ */}
        <select
          className="rounded-md border border-ink-200 bg-transparent px-1.5 py-1 text-xs dark:border-ink-700"
          title="Cỡ chữ"
          value={currentFontSize}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
        >
          <option value="">Cỡ</option>
          {FONT_SIZES.map((s) => <option key={s} value={`${s}px`}>{s}</option>)}
        </select>

        {/* Tiêu đề */}
        <select
          className="rounded-md border border-ink-200 bg-transparent px-1.5 py-1 text-xs dark:border-ink-700"
          title="Định dạng đoạn"
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
          }}
        >
          <option value="p">Đoạn</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
        </select>

        <Divider />

        <button type="button" className={cls(editor.isActive({ textAlign: 'left' }))} title="Căn trái" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></button>
        <button type="button" className={cls(editor.isActive({ textAlign: 'center' }))} title="Căn giữa" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></button>
        <button type="button" className={cls(editor.isActive({ textAlign: 'right' }))} title="Căn phải" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></button>

        <Divider />

        <button type="button" className={cls(editor.isActive('bulletList'))} title="Danh sách chấm" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" className={cls(editor.isActive('orderedList'))} title="Danh sách số" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <button type="button" className={cls(editor.isActive('taskList'))} title="Danh sách công việc" onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={16} /></button>

        <Divider />

        <button type="button" className={cls(editor.isActive('blockquote'))} title="Trích dẫn" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
        <button type="button" className={cls(editor.isActive('codeBlock'))} title="Khối mã" onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /></button>
        <button type="button" className={cls(editor.isActive('code'))} title="Mã nội dòng" onClick={() => editor.chain().focus().toggleCode().run()}><Code size={16} /></button>

        <Divider />

        <button type="button" className={cls(editor.isActive('link'))} title="Liên kết" onClick={setLink}><LinkIcon size={16} /></button>
        <button type="button" className={btn} title="Gỡ liên kết" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={16} /></button>
        <button type="button" className={btn} title="Chèn ảnh" disabled={uploading} onClick={() => fileRef.current?.click()}><ImageIcon size={16} /></button>
        <button type="button" className={btn} title="Nhúng video YouTube" onClick={insertVideo}><YoutubeIcon size={16} /></button>
        <button type="button" className={btn} title="Chèn bảng 3x3" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={16} /></button>
        <button type="button" className={btn} title="Spoiler (nội dung ẩn)" onClick={insertSpoiler}><EyeOff size={16} /></button>

        <Divider />

        <button type="button" className={btn} title="Đường kẻ ngang" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></button>
        <button type="button" className={btn} title="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></button>
        <button type="button" className={btn} title="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></button>

        <Divider />

        {/* Công cụ AI */}
        <div className="relative" ref={aiRef}>
          <button
            type="button"
            className={`${btn} flex items-center gap-1 ${aiOpen ? active : ''}`}
            title="Công cụ AI"
            disabled={aiBusy}
            onClick={() => setAiOpen((o) => !o)}
          >
            <Sparkles size={16} /><span className="text-xs">AI</span><ChevronDown size={12} />
          </button>
          {aiOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-800">
              <button type="button" className={aiMenuItem} onClick={() => runAi('/ai/writing/rewrite', {}, 'replace')}>Viết lại</button>
              <button type="button" className={aiMenuItem} onClick={aiTranslate}>Dịch…</button>
              <button type="button" className={aiMenuItem} onClick={() => runAi('/ai/writing/summarize', {}, 'append')}>Tóm tắt</button>
              <button type="button" className={aiMenuItem} onClick={() => runAi('/ai/writing/grammar', {}, 'replace')}>Sửa ngữ pháp</button>
              <button type="button" className={aiMenuItem} onClick={() => runAi('/ai/writing/continue', {}, 'append')}>Viết tiếp</button>
            </div>
          )}
        </div>

        {uploading && <span className="ml-1 text-xs text-ink-500">Đang tải ảnh…</span>}
        {aiBusy && <span className="ml-1 text-xs text-brand-600">AI đang xử lý…</span>}
        {aiErr && <span className="ml-1 text-xs text-red-500">{aiErr}</span>}

        {/* Bên phải: trạng thái lưu nháp + xem trước + toàn màn hình */}
        <div className="ml-auto flex items-center gap-0.5">
          {storageKey && saveState === 'saving' && <span className="mr-1 text-xs text-ink-400">Đang lưu…</span>}
          {storageKey && saveState === 'saved' && <span className="mr-1 text-xs text-ink-400">Đã lưu nháp</span>}
          <button type="button" className={cls(preview)} title={preview ? 'Quay lại soạn thảo' : 'Xem trước'} onClick={() => setPreview((p) => !p)}><Eye size={16} /></button>
          <button type="button" className={btn} title={fullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'} onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Công cụ bảng (chỉ hiện khi đang ở trong bảng) */}
      {inTable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-200/70 bg-ink-50 p-1.5 dark:border-ink-800 dark:bg-ink-900/50">
          <span className="mr-1 flex items-center gap-1 text-xs text-ink-500"><Type size={12} /> Bảng:</span>
          <button type="button" className={btn} title="Thêm hàng" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows size={16} /></button>
          <button type="button" className={btn} title="Thêm cột" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns size={16} /></button>
          <button type="button" className={btn} title="Xoá bảng" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 size={16} /></button>
        </div>
      )}

      {/* Vùng soạn thảo hoặc xem trước */}
      {preview ? (
        <div className={`overflow-y-auto p-3 ${fullscreen ? '' : 'max-h-[60vh]'}`}>
          <div className="mb-2 text-xs font-medium text-ink-400">Đang xem trước</div>
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
          />
        </div>
      ) : (
        <div className={`overflow-y-auto p-3 ${fullscreen ? '' : 'max-h-[60vh]'}`}>
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Đếm ký tự */}
      <div className="flex justify-end border-t border-ink-200/70 px-3 py-1.5 text-xs text-ink-400 dark:border-ink-800">
        {editor.storage.characterCount.characters()} ký tự
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
      </div>
    </div>
  );
}
