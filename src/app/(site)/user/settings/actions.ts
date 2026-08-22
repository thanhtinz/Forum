'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { isPublicImageRef } from '@/lib/icon';

export type SettingsState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Tên hiển thị không được để trống').max(50, 'Tên hiển thị tối đa 50 ký tự'),
  username: z.string().trim().toLowerCase()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số và dấu gạch dưới'),
  bio: z.string().trim().max(300, 'Giới thiệu tối đa 300 ký tự').optional(),
  image: z.string().trim().refine((v) => !v || isPublicImageRef(v), 'Ảnh đại diện phải là URL hợp lệ hoặc ảnh đã tải lên').optional(),
  cover: z.string().trim().refine((v) => !v || isPublicImageRef(v), 'Ảnh bìa phải là URL hợp lệ hoặc ảnh đã tải lên').optional(),
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] = issue.message;
  return out;
}

/** Cập nhật hồ sơ công khai: tên, tên đăng nhập, giới thiệu, ảnh. */
export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Bạn cần đăng nhập.' };

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    bio: formData.get('bio'),
    image: formData.get('image'),
    cover: formData.get('cover'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { name, username, bio, image, cover } = parsed.data;

  const taken = await db.user.findFirst({ where: { username, NOT: { id: session.user.id } }, select: { id: true } });
  if (taken) return { fieldErrors: { username: 'Tên đăng nhập đã có người dùng.' } };

  await db.user.update({
    where: { id: session.user.id },
    data: { name, username, bio: bio || null, image: image || null, cover: cover || null },
  });

  revalidatePath('/user/settings');
  revalidatePath('/user/dashboard');
  revalidatePath(`/u/${username}`);
  return { ok: true };
}

const passwordSchema = z.object({
  current: z.string().optional(),
  next: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự').max(100),
  confirm: z.string(),
}).refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Xác nhận mật khẩu không khớp' });

/** Đổi mật khẩu. Tài khoản đăng nhập bằng OAuth (chưa có mật khẩu) được phép đặt mới. */
export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Bạn cần đăng nhập.' };

  const parsed = passwordSchema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user) return { error: 'Không tìm thấy tài khoản.' };

  if (user.passwordHash) {
    const current = parsed.data.current ?? '';
    if (!current) return { fieldErrors: { current: 'Nhập mật khẩu hiện tại.' } };
    if (!(await bcrypt.compare(current, user.passwordHash))) return { fieldErrors: { current: 'Mật khẩu hiện tại không đúng.' } };
  }

  await db.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) } });
  return { ok: true };
}
