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
import {
  Bold, Italic, Underline, Strikethrough, Code, Quote, Code2,
  List, ListOrdered, ListChecks, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Unlink, Image as ImageIcon, Table as TableIcon,
  Youtube as YoutubeIcon, Minus, Undo2, Redo2, Type, Palette, Highlighter,
  Rows, Columns, Trash2, EyeOff,
} from 'lucide-react';
import { uploadEditorImage } from '@/lib/api';

interface TipTapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_SIZES = [12, 14, 16, 18, 24, 32];

export default function TipTapEditor({ value, onChange, placeholder }: TipTapEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

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

  const inTable = editor.isActive('table');

  // Giá trị heading hiện tại cho select
  let headingValue = 'p';
  for (let lvl = 1; lvl <= 6; lvl++) {
    if (editor.isActive('heading', { level: lvl })) { headingValue = `h${lvl}`; break; }
  }

  const currentFontSize = (editor.getAttributes('textStyle').fontSize as string | undefined) || '';

  return (
    <div className="card overflow-hidden">
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

        {uploading && <span className="ml-1 text-xs text-ink-500">Đang tải ảnh…</span>}
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

      {/* Vùng soạn thảo */}
      <div className="max-h-[60vh] overflow-y-auto p-3">
        <EditorContent editor={editor} />
      </div>

      {/* Đếm ký tự */}
      <div className="flex justify-end border-t border-ink-200/70 px-3 py-1.5 text-xs text-ink-400 dark:border-ink-800">
        {editor.storage.characterCount.characters()} ký tự
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
    </div>
  );
}
