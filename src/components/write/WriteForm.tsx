'use client';

import { useActionState } from 'react';
import { PenLine, Send } from 'lucide-react';
import { createPost, type WriteState } from '@/app/(site)/user/write/actions';

export interface CatOption { slug: string; name: string; color?: string | null; parentName?: string | null }

const STYLES = [
  { v: 'STANDARD', label: 'Ảnh trên (chuẩn)' },
  { v: 'WIDE', label: 'Ảnh ngang (rộng)' },
  { v: 'TEXT_ONLY', label: 'Chỉ chữ (không ảnh)' },
];

export function WriteForm({ categories }: { categories: CatOption[] }) {
  const [state, action, pending] = useActionState<WriteState, FormData>(createPost, {});

  return (
    <form action={action} className="card space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-2 border-b border-ink-100 pb-4 dark:border-ink-800">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50"><PenLine size={18} /></span>
        <div>
          <h1 className="text-lg font-bold">Đăng bài viết</h1>
          <p className="text-xs text-ink-400">Chia sẻ nội dung của bạn với cộng đồng Nova.</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tiêu đề <b className="text-red-500">*</b></span>
        <input name="title" required minLength={5} maxLength={150} className="input" placeholder="Nhập tiêu đề hấp dẫn…" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Mô tả ngắn</span>
        <textarea name="excerpt" rows={2} maxLength={300} className="input resize-y" placeholder="Tóm tắt ngắn gọn (hiển thị ở thẻ bài viết)…" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nội dung <b className="text-red-500">*</b></span>
        <textarea name="content" required minLength={20} rows={10} className="input resize-y font-normal" placeholder="Viết nội dung tại đây… (mỗi đoạn cách nhau 1 dòng trống)" />
        <span className="mt-1 block text-xs text-ink-400">Mẹo: để trống 1 dòng để tách đoạn.</span>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Chuyên mục <b className="text-red-500">*</b> <span className="font-normal text-ink-400">(chọn được nhiều)</span></span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.slug} className="group cursor-pointer">
              <input type="checkbox" name="categories" value={c.slug} className="peer sr-only" />
              <span className="chip gap-1 border border-ink-200 bg-white text-ink-600 peer-checked:border-transparent peer-checked:bg-brand-500 peer-checked:text-white dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300"
                style={c.color ? undefined : undefined}>
                {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Thẻ (tag)</span>
        <input name="tags" className="input" placeholder="Cách nhau bằng dấu phẩy: React, Next.js, Mẹo…" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ảnh bìa (URL)</span>
          <input name="cover" type="url" className="input" placeholder="https://…" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Kiểu thẻ hiển thị</span>
          <select name="cardStyle" className="input" defaultValue="STANDARD">
            {STYLES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 disabled:opacity-60">
          <Send size={16} /> {pending ? 'Đang đăng…' : 'Đăng bài'}
        </button>
      </div>
    </form>
  );
}
