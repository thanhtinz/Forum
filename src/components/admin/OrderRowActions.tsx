'use client';

import { useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { markOrderPaid, cancelOrder } from '@/app/admin/actions';

type Props = { id: string; code: string; status: string; isTopup: boolean; amountLabel: string };

export function OrderRowActions({ id, code, status, isTopup, amountLabel }: Props) {
  const [pending, start] = useTransition();
  if (status !== 'PENDING') return null;

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={pending} title="Xác nhận đã thanh toán"
        onClick={() => {
          const extra = isTopup ? `\n\nSố dư của người mua sẽ được cộng ${amountLabel}.` : '';
          if (confirm(`Xác nhận đơn ${code} đã thanh toán?${extra}`)) start(() => markOrderPaid(id));
        }}
        className="grid size-8 place-items-center rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:hover:bg-emerald-950">
        <Check size={15} />
      </button>
      <button type="button" disabled={pending} title="Huỷ đơn"
        onClick={() => { if (confirm(`Huỷ đơn ${code}?`)) start(() => cancelOrder(id)); }}
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
        <X size={15} />
      </button>
    </div>
  );
}
