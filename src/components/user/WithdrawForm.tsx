'use client';

import { useActionState } from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { requestWithdrawal } from '@/app/(site)/user/withdraw/actions';
import { MIN_WITHDRAWAL, type WithdrawState } from '@/lib/withdraw';
import { fmtVnd } from '@/lib/utils';

export function WithdrawForm({ balance }: { balance: number }) {
  const [state, action, pending] = useActionState<WithdrawState, FormData>(requestWithdrawal, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 size={40} className="text-emerald-500" />
        <p className="font-semibold text-ink-900 dark:text-white">Đã gửi yêu cầu rút tiền</p>
        <p className="max-w-sm text-sm text-ink-500">Yêu cầu của bạn đang chờ quản trị viên duyệt. Số tiền đã được tạm giữ và sẽ được chuyển khoản sau khi duyệt.</p>
      </div>
    );
  }

  const canWithdraw = balance >= MIN_WITHDRAWAL;

  return (
    <form action={action} className="space-y-3">
      {!canWithdraw && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          Số dư khả dụng của bạn chưa đạt mức rút tối thiểu ({fmtVnd(MIN_WITHDRAWAL)}).
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Số tiền muốn rút (₫)</span>
        <input name="amount" type="number" min={MIN_WITHDRAWAL} max={balance} step={1000} required disabled={!canWithdraw}
          className="input max-w-xs" placeholder={`Tối thiểu ${MIN_WITHDRAWAL.toLocaleString('vi-VN')}`} />
        <span className="mt-1 block text-xs text-ink-400">Khả dụng: {fmtVnd(balance)}</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ngân hàng</span>
          <input name="bankName" required disabled={!canWithdraw} className="input" placeholder="Vietcombank" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Số tài khoản</span>
          <input name="bankAccount" required disabled={!canWithdraw} className="input" placeholder="0123456789" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Chủ tài khoản</span>
          <input name="bankHolder" required disabled={!canWithdraw} className="input uppercase" placeholder="NGUYEN VAN A" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Ghi chú (không bắt buộc)</span>
        <input name="note" disabled={!canWithdraw} className="input" placeholder="Ví dụ: rút hoa hồng bán nội dung" />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending || !canWithdraw} className="btn-primary disabled:opacity-60">
        <Banknote size={16} /> {pending ? 'Đang gửi…' : 'Gửi yêu cầu rút tiền'}
      </button>
    </form>
  );
}
