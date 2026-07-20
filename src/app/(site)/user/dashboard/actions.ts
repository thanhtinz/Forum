'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { doCheckin, type CheckinResult } from '@/lib/checkin';

export async function checkinAction(): Promise<CheckinResult & { error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };
  const res = await doCheckin(userId);
  revalidatePath('/user/dashboard');
  return res;
}
