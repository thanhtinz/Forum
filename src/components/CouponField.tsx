'use client';

import { useState } from 'react';
import { TicketPercent, X } from 'lucide-react';

/**
 * Ô nhập mã giảm giá cho form mua hàng.
 * Ẩn sau một liên kết nhỏ để không làm rối khung mua; giá trị gửi kèm field `coupon`.
 */
export function CouponField() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mx-auto mt-2 flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-600">
        <TicketPercent size={13} /> Tôi có mã giảm giá
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="relative flex-1">
        <TicketPercent size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input name="coupon" autoFocus autoCapitalize="characters" autoComplete="off"
          placeholder="Nhập mã giảm giá"
          className="h-9 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-2 text-sm uppercase outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-900" />
      </div>
      <button type="button" onClick={() => setOpen(false)} title="Bỏ mã"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-400 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
        <X size={15} />
      </button>
    </div>
  );
}
