'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { duyetCauHoi, tuChoiCauHoi } from './actions';
import { cn } from '@/lib/utils';

/** Hai nút xét duyệt cho một câu hỏi đang chờ. */
export function QuizRowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  const chay = (fn: () => Promise<{ error?: string }>) => {
    setLoi(null);
    start(async () => {
      const r = await fn();
      if (r?.error) setLoi(r.error);
    });
  };

  const Btn = ({ onClick, className, children }: {
    onClick: () => void; className: string; children: React.ReactNode;
  }) => (
    <button type="button" disabled={pending} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-50', className)}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {loi && <span className="mr-auto text-xs text-red-600">{loi}</span>}
      <Btn className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
        onClick={() => chay(() => duyetCauHoi(id))}>
        <Check size={14} /> Duyệt
      </Btn>
      <Btn className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
        onClick={() => {
          const ly = prompt('Lý do từ chối (người đăng sẽ đọc được, cọc không hoàn):') ?? '';
          if (ly.trim()) chay(() => tuChoiCauHoi(id, ly));
        }}>
        <X size={14} /> Từ chối
      </Btn>
    </div>
  );
}
