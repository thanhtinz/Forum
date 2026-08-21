'use client';

import { useTransition } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import { setReportStatus, resolveReportAndRemove } from '@/app/(site)/admin/actions';
import { cn } from '@/lib/utils';

export function ReportRowActions({ id, status, hasTarget }: { id: string; status: string; hasTarget: boolean }) {
  const [pending, start] = useTransition();
  if (status !== 'OPEN') return null;

  const Btn = ({ onClick, className, children }: { onClick: () => void; className: string; children: React.ReactNode }) => (
    <button type="button" disabled={pending} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-50', className)}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasTarget && (
        <Btn className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
          onClick={() => { if (confirm('Ẩn/xoá nội dung bị báo cáo và đánh dấu đã xử lý?')) start(() => resolveReportAndRemove(id)); }}>
          <Trash2 size={14} /> Gỡ nội dung
        </Btn>
      )}
      <Btn className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
        onClick={() => start(() => setReportStatus(id, 'RESOLVED'))}><Check size={14} /> Đã xử lý</Btn>
      <Btn className="border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
        onClick={() => start(() => setReportStatus(id, 'DISMISSED'))}><X size={14} /> Bỏ qua</Btn>
    </div>
  );
}
