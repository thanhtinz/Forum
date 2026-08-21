'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { MIN_WITHDRAWAL, type WithdrawState } from '@/lib/withdraw';

export async function requestWithdrawal(_prev: WithdrawState, formData: FormData): Promise<WithdrawState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Vui lòng đăng nhập.' };
  const userId = session.user.id;

  const amount = Math.floor(Number(formData.get('amount')));
  const bankName = String(formData.get('bankName') ?? '').trim();
  const bankAccount = String(formData.get('bankAccount') ?? '').trim();
  const bankHolder = String(formData.get('bankHolder') ?? '').trim().toUpperCase();
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL)
    return { error: `Số tiền rút tối thiểu là ${MIN_WITHDRAWAL.toLocaleString('vi-VN')}₫.` };
  if (!bankName || !bankAccount || !bankHolder)
    return { error: 'Vui lòng nhập đầy đủ thông tin ngân hàng.' };

  try {
    await db.$transaction(async (tx) => {
      // Trừ số dư khả dụng một cách nguyên tử (tránh rút vượt số dư khi bấm nhiều lần)
      const res = await tx.user.updateMany({
        where: { id: userId, balance: { gte: amount } },
        data: { balance: { decrement: amount }, frozenBalance: { increment: amount } },
      });
      if (res.count === 0) throw new Error('INSUFFICIENT');

      const after = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
      await tx.balanceLog.create({ data: { userId, amount: -amount, balance: after.balance, reason: 'WITHDRAW', note: 'Yêu cầu rút tiền — đang chờ duyệt' } });
      const w = await tx.withdrawal.create({ data: { userId, amount, status: 'PENDING', bankName, bankAccount, bankHolder, note } });
      await notify({ userId, type: 'SYSTEM', title: 'Đã gửi yêu cầu rút tiền', content: `Số tiền ${amount.toLocaleString('vi-VN')}₫ đang chờ duyệt.`, link: '/user/withdraw' }, tx);
      return w;
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT') return { error: 'Số dư không đủ để thực hiện yêu cầu.' };
    return { error: 'Đã có lỗi xảy ra, vui lòng thử lại.' };
  }

  revalidatePath('/user/withdraw');
  revalidatePath('/user/balance');
  return { ok: true };
}
