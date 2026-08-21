'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { doCheckin, type CheckinResult } from '@/lib/checkin';
import { checkAndAwardMedals } from '@/lib/medals';

export async function checkinAction(): Promise<CheckinResult & { error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Bạn cần đăng nhập.' };
  const res = await doCheckin(userId);
  if (res.ok) await checkAndAwardMedals(userId).catch(() => {});
  revalidatePath('/user/dashboard');
  return res;
}
