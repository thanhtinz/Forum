'use client';

import { useTransition } from 'react';
import { Check, EyeOff, Star, Trash2, Send } from 'lucide-react';
import { approvePost, setPostStatus, deletePost, togglePostFeatured } from '@/app/(site)/admin/actions';
import { cn } from '@/lib/utils';

type Props = { id: string; status: string; featured: boolean };

export function PostRowActions({ id, status, featured }: Props) {
  const [pending, start] = useTransition();

  const Btn = ({ onClick, title, className, children }: { onClick: () => void; title: string; className?: string; children: React.ReactNode }) => (
    <button type="button" title={title} disabled={pending} onClick={onClick}
      className={cn('grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800', className)}>
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {status === 'PENDING' && (
        <Btn title="Duyệt & đăng" className="!border-emerald-300 !text-emerald-600 hover:!bg-emerald-50 dark:!border-emerald-800 dark:hover:!bg-emerald-950"
          onClick={() => start(() => approvePost(id))}><Check size={15} /></Btn>
      )}
      {status === 'PUBLISHED' ? (
        <Btn title="Ẩn (lưu trữ)" onClick={() => start(() => setPostStatus(id, 'ARCHIVED'))}><EyeOff size={15} /></Btn>
      ) : status !== 'PENDING' ? (
        <Btn title="Đăng lại" onClick={() => start(() => setPostStatus(id, 'PUBLISHED'))}><Send size={15} /></Btn>
      ) : null}
      <Btn title={featured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
        className={featured ? '!border-amber-300 !text-amber-500 hover:!bg-amber-50 dark:!border-amber-800 dark:hover:!bg-amber-950' : ''}
        onClick={() => start(() => togglePostFeatured(id))}><Star size={15} className={featured ? 'fill-current' : ''} /></Btn>
      <Btn title="Xoá" className="!border-rose-300 !text-rose-600 hover:!bg-rose-50 dark:!border-rose-800 dark:hover:!bg-rose-950"
        onClick={() => { if (confirm('Xoá bài viết này? Không thể hoàn tác.')) start(() => deletePost(id)); }}><Trash2 size={15} /></Btn>
    </div>
  );
}
