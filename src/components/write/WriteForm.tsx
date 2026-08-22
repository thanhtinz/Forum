'use client';

import { useActionState, useState } from 'react';
import { PenLine, Send, Coins, Lock, Crown, Gift, ThumbsUp, MessageSquare, Target } from 'lucide-react';
import { createPost, type WriteState } from '@/app/(site)/user/write/actions';
import { DownloadsEditor, type DownloadDraft } from './DownloadsEditor';
import { BBCodeEditor } from '@/components/editor/BBCodeEditor';
import { PAID_ACCESS } from '@/lib/sell-permission';
import { ActionForm } from '@/components/ActionForm';

const PAID_VALUES: string[] = [...PAID_ACCESS];

const ACCESS_OPTIONS = [
  { v: 'FREE', label: 'Miễn phí', icon: Gift },
  { v: 'LOGIN_REQUIRED', label: 'Cần đăng nhập', icon: Lock },
  { v: 'LIKE', label: 'Thích để mở', icon: ThumbsUp },
  { v: 'COMMENT', label: 'Bình luận để mở', icon: MessageSquare },
  { v: 'LIKE_COMMENT', label: 'Thích + bình luận', icon: ThumbsUp },
  { v: 'LIKE_GOAL', label: 'Đủ số lượt thích', icon: Target },
  { v: 'COMMENT_GOAL', label: 'Đủ số bình luận', icon: Target },
  { v: 'POINTS', label: 'Bán bằng điểm', icon: Coins },
  { v: 'PAID', label: 'Bán bằng tiền (VND)', icon: Lock },
  { v: 'VIP_ONLY', label: 'Chỉ VIP', icon: Crown },
];

export interface CatOption { slug: string; name: string; color?: string | null; parentName?: string | null }

/** Dữ liệu điền sẵn khi sửa bài. */
export interface PostDraft {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  hiddenContent: string;
  cover: string;
  cardStyle: string;
  access: string;
  pricePoints: string;
  priceAmount: string;
  unlockLikes: string;
  unlockComments: string;
  tags: string;
  categorySlugs: string[];
  downloads: DownloadDraft[];
}

export interface WriteFormProps {
  categories: CatOption[];
  /** Chỉ quản trị viên mới được đăng bán nội dung. */
  canSell?: boolean;
  /** Có giá trị = chế độ sửa bài. */
  initial?: PostDraft;
  /** Server action thay thế (dùng cho sửa bài). */
  action?: (prev: WriteState, formData: FormData) => Promise<WriteState>;
}

const STYLES = [
  { v: 'STANDARD', label: 'Ảnh trên (chuẩn)' },
  { v: 'WIDE', label: 'Ảnh ngang (rộng)' },
  { v: 'TEXT_ONLY', label: 'Chỉ chữ (không ảnh)' },
];

export function WriteForm({ categories, canSell = false, initial, action: customAction }: WriteFormProps) {
  const isEdit = !!initial;
  const [state, action, pending] = useActionState<WriteState, FormData>(customAction ?? createPost, {});
  const [access, setAccess] = useState(initial?.access ?? 'FREE');
  const visibleAccess = ACCESS_OPTIONS.filter((o) => canSell || !PAID_VALUES.includes(o.v));
  const isPaid = PAID_VALUES.includes(access);
  // Mọi mức khác FREE/LOGIN_REQUIRED đều khoá phần nội dung ẩn
  const hasGate = access !== 'FREE' && access !== 'LOGIN_REQUIRED';

  return (
    <ActionForm action={action} className="card space-y-5 p-5 sm:p-6">
      {initial && <input type="hidden" name="postId" value={initial.id} />}
      <div className="flex items-center gap-2 border-b border-ink-100 pb-4 dark:border-ink-800">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50"><PenLine size={18} /></span>
        <div>
          <h1 className="text-lg font-bold">{isEdit ? 'Sửa bài viết' : 'Đăng bài viết'}</h1>
          <p className="text-xs text-ink-400">{isEdit ? 'Cập nhật nội dung bài viết của bạn.' : 'Chia sẻ nội dung của bạn với cộng đồng Nova.'}</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tiêu đề <b className="text-red-500">*</b></span>
        <input name="title" required minLength={5} maxLength={150} defaultValue={initial?.title} className="input" placeholder="Nhập tiêu đề hấp dẫn…" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Mô tả ngắn</span>
        <textarea name="excerpt" rows={2} maxLength={300} defaultValue={initial?.excerpt} className="input resize-y" placeholder="Tóm tắt ngắn gọn (hiển thị ở thẻ bài viết)…" />
      </label>

      <div className="block">
        <span className="mb-1 block text-sm font-medium">Nội dung <b className="text-red-500">*</b></span>
        <BBCodeEditor name="content" required minLength={20} rows={12} defaultValue={initial?.content}
          placeholder="Viết nội dung tại đây… Dùng thanh công cụ hoặc gõ BBCode: [b]đậm[/b], [url=…]liên kết[/url]" />
        <span className="mt-1 block text-xs text-ink-400">Mẹo: để trống 1 dòng để tách đoạn. Bấm “Xem trước” để kiểm tra định dạng.</span>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Chuyên mục <b className="text-red-500">*</b> <span className="font-normal text-ink-400">(chọn được nhiều)</span></span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.slug} className="group cursor-pointer">
              <input type="checkbox" name="categories" value={c.slug} defaultChecked={initial?.categorySlugs.includes(c.slug)} className="peer sr-only" />
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
        <input name="tags" defaultValue={initial?.tags} className="input" placeholder="Cách nhau bằng dấu phẩy: React, Next.js, Mẹo…" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ảnh bìa (URL)</span>
          <input name="cover" type="url" defaultValue={initial?.cover} className="input" placeholder="https://…" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Kiểu thẻ hiển thị</span>
          <select name="cardStyle" className="input" defaultValue={initial?.cardStyle ?? "STANDARD"}>
            {STYLES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {/* Quyền xem — chỉ quản trị viên mới thấy các mức bán hàng */}
      <div className="rounded-2xl border border-ink-200 p-4 dark:border-ink-700">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Coins size={16} className="text-amber-500" /> {canSell ? 'Bán nội dung (tuỳ chọn)' : 'Quyền xem bài'}
        </div>

        {!canSell && (
          <p className="mb-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/50">
            Nội dung trả phí do ban quản trị đăng ở cửa hàng. Bài của thành viên được chia sẻ miễn phí.
          </p>
        )}

        {/* Giữ nguyên mức hiện tại nếu nó không nằm trong danh sách chọn được
            (vd. admin đăng hàng, sau đó người không có quyền bán mở form sửa) */}
        {!visibleAccess.some((o) => o.v === access) && <input type="hidden" name="access" value={access} />}

        <div className="flex flex-wrap gap-2">
          {visibleAccess.map((o) => {
            const Icon = o.icon;
            const on = access === o.v;
            return (
              <label key={o.v} className="cursor-pointer">
                <input type="radio" name="access" value={o.v} checked={on} onChange={() => setAccess(o.v)} className="peer sr-only" />
                <span className={`chip gap-1 border ${on ? 'border-transparent bg-brand-500 text-white' : 'border-ink-200 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'}`}>
                  <Icon size={12} /> {o.label}
                </span>
              </label>
            );
          })}
        </div>

        {(access === 'LIKE' || access === 'COMMENT' || access === 'LIKE_COMMENT') && (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            Tính theo <b>từng người xem</b>: mỗi người phải tự {access === 'LIKE' ? 'thích bài' : access === 'COMMENT' ? 'bình luận' : 'thích và bình luận'} thì mới mở được nội dung ẩn.
          </p>
        )}

        {access === 'LIKE_GOAL' && (
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">Cần bao nhiêu lượt thích để mở?</span>
            <input name="unlockLikes" type="number" min={1} defaultValue={initial?.unlockLikes} className="input max-w-xs" placeholder="Ví dụ: 50" />
            <span className="mt-1 block text-xs text-ink-400">Tính <b>tổng lượt thích của tất cả mọi người</b>. Đạt mốc là mở cho tất cả.</span>
          </label>
        )}
        {access === 'COMMENT_GOAL' && (
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">Cần bao nhiêu bình luận để mở?</span>
            <input name="unlockComments" type="number" min={1} defaultValue={initial?.unlockComments} className="input max-w-xs" placeholder="Ví dụ: 20" />
            <span className="mt-1 block text-xs text-ink-400">Tính <b>tổng bình luận của tất cả mọi người</b>. Đạt mốc là mở cho tất cả.</span>
          </label>
        )}

        {access === 'POINTS' && (
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">Giá (điểm)</span>
            <input name="pricePoints" type="number" min={1} defaultValue={initial?.pricePoints} className="input max-w-xs" placeholder="Ví dụ: 50" />
          </label>
        )}
        {access === 'PAID' && (
          <label className="mt-3 block">
            <span className="mb-1 block text-sm font-medium">Giá (VND)</span>
            <input name="priceAmount" type="number" min={1000} step={1000} defaultValue={initial?.priceAmount} className="input max-w-xs" placeholder="Ví dụ: 20000" />
          </label>
        )}

        {hasGate && (
          <>
            <div className="mt-3 block">
              <span className="mb-1 block text-sm font-medium">
                Nội dung ẩn ({isPaid ? 'sau khi mua mới xem được' : 'mở khoá mới xem được'}) <b className="text-red-500">*</b>
              </span>
              <BBCodeEditor name="hiddenContent" rows={6} defaultValue={initial?.hiddenContent}
                placeholder="Phần nội dung bị khoá: link tải, hướng dẫn chi tiết, mã nguồn…" />
            </div>
            {isPaid && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                💰 Ăn chia: bạn nhận <b>70%</b> mỗi lượt bán, nền tảng giữ <b>30%</b> hoa hồng. Tiền/điểm được cộng tự động khi có người mua.
              </p>
            )}
          </>
        )}

        {/* Tệp tải xuống — dùng cho cả bài miễn phí lẫn trả phí */}
        <div className="mt-4 border-t border-ink-100 pt-4 dark:border-ink-800">
          <div className="mb-2">
            <span className="text-sm font-medium">Tệp tải xuống</span>
            <p className="text-xs text-ink-400">
              Liên kết thật được giấu khỏi trình duyệt: người tải đi qua cổng kiểm tra quyền và hạn mức mỗi ngày.
            </p>
          </div>
          <DownloadsEditor initial={initial?.downloads} />
        </div>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 disabled:opacity-60">
          <Send size={16} /> {pending ? (isEdit ? 'Đang lưu…' : 'Đang đăng…') : (isEdit ? 'Lưu thay đổi' : 'Đăng bài')}
        </button>
      </div>
    </ActionForm>
  );
}
