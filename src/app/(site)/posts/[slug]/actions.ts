'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { purchaseContent } from '@/lib/purchase';

export interface UnlockState {
  error?: string;
  ok?: boolean;
}

const MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Không tìm thấy bài viết.',
  NOT_PURCHASABLE: 'Nội dung này không mở khoá bằng cách mua.',
  INSUFFICIENT_POINTS: 'Bạn không đủ điểm để mở khoá.',
  INSUFFICIENT_BALANCE: 'Số dư của bạn không đủ. Hãy nạp thêm.',
};

export async function unlockPost(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const postId = String(formData.get('postId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  if (!postId) return { error: 'Thiếu thông tin bài viết.' };

  const res = await purchaseContent(userId, postId);
  if (!res.ok) return { error: MESSAGES[res.error] ?? 'Không thể mở khoá.' };

  if (slug) revalidatePath(`/posts/${slug}`);
  return { ok: true };
}
