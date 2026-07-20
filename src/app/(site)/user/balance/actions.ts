'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { vietQrUrl, SEPAY } from '@/lib/sepay';

export interface TopupState {
  ok?: boolean;
  error?: string;
  code?: string;
  amount?: number;
  qrUrl?: string;
  bank?: { bank: string; account: string; holder: string };
}

function newOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `ORD-${ts}-${rnd}`;
}

const MIN = 10000;
const MAX = 50000000;

/** Tạo đơn nạp tiền (PENDING) và trả về mã + QR để người dùng chuyển khoản. */
export async function createTopup(_prev: TopupState, formData: FormData): Promise<TopupState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const amount = Math.floor(Number(formData.get('amount') ?? 0) || 0);
  if (amount < MIN) return { error: `Số tiền nạp tối thiểu ${MIN.toLocaleString('vi-VN')}₫.` };
  if (amount > MAX) return { error: `Số tiền nạp tối đa ${MAX.toLocaleString('vi-VN')}₫.` };

  const code = newOrderCode();
  await db.order.create({
    data: { code, userId, type: 'TOPUP', status: 'PENDING', amount, finalAmount: amount },
  });

  revalidatePath('/user/balance');
  return {
    ok: true, code, amount,
    qrUrl: vietQrUrl(amount, code),
    bank: { bank: SEPAY.bank, account: SEPAY.account, holder: SEPAY.holder },
  };
}
