'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { ActionForm } from '@/components/ActionForm';
import { suaTheLoai, taoTheLoai, xoaTheLoai, type TheLoaiState } from '../actions';
import { QUIZ_THE_LOAI_MO_TA_MAX, QUIZ_THE_LOAI_TEN_MAX } from '@/lib/quiz-const';

export interface TheLoaiHang {
  id: string;
  slug: string;
  name: string;
  note: string | null;
  order: number;
  soCau: number;
}

/** Biểu mẫu lập thể loại mới. */
export function TheLoaiMoi() {
  const router = useRouter();
  const [state, action, dangChay] = useActionState<TheLoaiState, FormData>(taoTheLoai, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  return (
    <ActionForm ref={formRef} action={action} className="card space-y-3 p-4">
      <h2 className="text-sm font-bold text-ink-800 dark:text-ink-100">Lập thể loại mới</h2>
      <label className="block">
        <span className="label">Tên thể loại</span>
        <input name="ten" required maxLength={QUIZ_THE_LOAI_TEN_MAX} className="input"
          placeholder="Ví dụ: Lịch sử Việt Nam" />
      </label>
      <label className="block">
        <span className="label">Mô tả ngắn (không bắt buộc)</span>
        <textarea name="moTa" rows={2} maxLength={QUIZ_THE_LOAI_MO_TA_MAX} className="input"
          placeholder="Một dòng nói rõ thể loại này nhận câu hỏi gì." />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Thứ tự</span>
          <input name="thuTu" type="number" defaultValue={0} className="input !w-24" />
        </label>
        <button type="submit" disabled={dangChay} className="btn-primary disabled:opacity-60">
          <Plus size={15} /> {dangChay ? 'Đang lưu…' : 'Lập thể loại'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </ActionForm>
  );
}

/** Một hàng thể loại: sửa tại chỗ, và bỏ được khi chưa có câu hỏi nào. */
export function TheLoaiDong({ t }: { t: TheLoaiHang }) {
  const router = useRouter();
  const [state, action, dangLuu] = useActionState<TheLoaiState, FormData>(suaTheLoai, {});
  const [dangXoa, start] = useTransition();
  const [loiXoa, setLoiXoa] = useState<string | null>(null);

  useEffect(() => { if (state.ok) router.refresh(); }, [state, router]);

  const xoa = () => {
    setLoiXoa(null);
    start(async () => {
      const r = await xoaTheLoai(t.id);
      if (r.error) setLoiXoa(r.error);
      else router.refresh();
    });
  };

  return (
    <ActionForm action={action} className="card space-y-2 p-4">
      <input type="hidden" name="id" value={t.id} />
      <div className="flex flex-wrap items-center gap-2">
        <input name="ten" defaultValue={t.name} required maxLength={QUIZ_THE_LOAI_TEN_MAX}
          className="input min-w-40 flex-1" />
        <input name="thuTu" type="number" defaultValue={t.order} className="input !w-20" />
        <span className="text-xs text-ink-400">/{t.slug} · {t.soCau} câu</span>
      </div>
      <textarea name="moTa" defaultValue={t.note ?? ''} rows={2}
        maxLength={QUIZ_THE_LOAI_MO_TA_MAX} className="input" placeholder="Mô tả ngắn" />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {(state.error || loiXoa) && (
          <span className="mr-auto text-xs text-red-600">{state.error ?? loiXoa}</span>
        )}
        <button type="button" onClick={xoa} disabled={dangXoa}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-300 px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
          <Trash2 size={14} /> Bỏ
        </button>
        <button type="submit" disabled={dangLuu}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand-300 px-2.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:hover:bg-brand-950">
          <Save size={14} /> {dangLuu ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </ActionForm>
  );
}
