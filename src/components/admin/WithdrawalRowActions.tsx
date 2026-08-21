'use client';

import { useTransition } from 'react';
import { Check, X, Banknote } from 'lucide-react';
import { setWithdrawalStatus } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type Props = { id: string; status: string };

export function WithdrawalRowActions({ id, status }: Props) {
  const [pending, start] = useTransition();
  if (status === 'PAID' || status === 'REJECTED') return null;

  const Btn = ({ onClick, title, className, children }: { onClick: () => void; title: string; className?: string; children: React.ReactNode }) => (
    <button type="button" title={title} disabled={pending} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-50', className)}>
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {status === 'PENDING' && (
        <Btn title="Duyệt" className="border-sky-300 text-sky-600 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950"
          onClick={() => start(() => setWithdrawalStatus(id, 'APPROVED'))}><Check size={14} /> Duyệt</Btn>
      )}
      <Btn title="Đã chuyển tiền" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
        onClick={() => { if (confirm('Xác nhận đã chuyển tiền cho người dùng?')) start(() => setWithdrawalStatus(id, 'PAID')); }}><Banknote size={14} /> Đã trả</Btn>
      {status === 'PENDING' && (
        <Btn title="Từ chối" className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
          onClick={() => { if (confirm('Từ chối yêu cầu rút tiền này?')) start(() => setWithdrawalStatus(id, 'REJECTED')); }}><X size={14} /> Từ chối</Btn>
      )}
    </div>
  );
}
