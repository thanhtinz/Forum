'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Link2, Send, Smile } from 'lucide-react';
import { uploadEditorImage } from '@/lib/api';
import { isStickerContent } from './EmojiStickerPicker';
import { Avatar } from './Header';
import { EmojiStickerPicker } from './EmojiStickerPicker';

interface Props {
  user: any;
  onSubmit: (content: string) => Promise<void>;
  posting?: boolean;
  placeholder?: string;
}

export function CommentBox({ user, onSubmit, posting = false, placeholder = 'Viết bình luận…' }: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(content: string) {
    if (!content.trim() || posting || uploading) return;
    await onSubmit(content);
    setText('');
    setFocused(false);
    setPicker(false);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadEditorImage(file);
      await submit(url);
    } catch {} finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function insertLink() {
    const url = window.prompt('Nhập URL liên kết:');
    if (!url?.trim()) return;
    setText((t) => (t && !t.endsWith('\n') ? t + '\n' : t) + url.trim());
    setFocused(true);
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar user={user} size={32} />
      <div className="flex-1">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={focused ? 3 : 2}
            placeholder={placeholder}
            className="input w-full resize-none pr-24"
          />
          <div className="absolute right-2 top-2 flex gap-0.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="rounded p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Gửi ảnh">
              <ImageIcon size={15} />
            </button>
            <button type="button" onClick={insertLink}
              className="rounded p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Chèn link">
              <Link2 size={15} />
            </button>
            <button type="button" onClick={() => setPicker((v) => !v)}
              className={`rounded p-1 hover:bg-ink-100 dark:hover:bg-ink-800 ${picker ? 'text-brand-600' : 'text-ink-400'}`}
              title="Emoji / Sticker">
              <Smile size={15} />
            </button>
          </div>
          {picker && (
            <EmojiStickerPicker
              onEmoji={(e) => setText((t) => t + e)}
              onSticker={(url) => { setPicker(false); submit(url); }}
              onClose={() => setPicker(false)}
            />
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        {focused && (
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setText(''); setFocused(false); setPicker(false); }}
              className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Huỷ</button>
            <button type="button" onClick={() => submit(text)} disabled={posting || uploading || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Gửi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentContent({ text }: { text: string }) {
  if (isStickerContent(text)) {
    return <img src={text.trim()} alt="" className="mt-1 max-h-48 max-w-xs rounded object-contain" />;
  }
  return <p className="whitespace-pre-wrap break-words text-sm">{text}</p>;
}
