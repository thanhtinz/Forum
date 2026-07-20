'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';
import { db } from '@/lib/db';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function safeCallback(raw: FormDataEntryValue | null): string {
  const s = String(raw ?? '/');
  // Chỉ cho phép đường dẫn nội bộ (chống open-redirect)
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = safeCallback(formData.get('callbackUrl'));

  if (!identifier || !password) return { error: 'Vui lòng nhập đầy đủ thông tin.' };

  try {
    await signIn('credentials', { identifier, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Email/tên đăng nhập hoặc mật khẩu không đúng.' };
    throw e; // redirect thành công cũng ném lỗi → phải re-throw
  }
  return {};
}

const registerSchema = z.object({
  username: z.string().trim().toLowerCase()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số và dấu gạch dưới'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
});

function newInviteCode(username: string): string {
  const rnd = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase();
  return `${username.slice(0, 4).toUpperCase()}${rnd}`;
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const { username, email, password } = parsed.data;
  const callbackUrl = safeCallback(formData.get('callbackUrl'));
  const ref = String(formData.get('ref') ?? '').trim();

  const existed = await db.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true, username: true } });
  if (existed) {
    if (existed.email === email) return { fieldErrors: { email: 'Email đã được sử dụng.' } };
    return { fieldErrors: { username: 'Tên đăng nhập đã tồn tại.' } };
  }

  let invitedById: string | null = null;
  if (ref) {
    const inviter = await db.user.findUnique({ where: { inviteCode: ref }, select: { id: true } });
    invitedById = inviter?.id ?? null;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: { username, email, name: username, passwordHash, inviteCode: newInviteCode(username), invitedById },
  });

  try {
    await signIn('credentials', { identifier: email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Đăng ký thành công nhưng đăng nhập tự động thất bại. Hãy đăng nhập lại.' };
    throw e;
  }
  return {};
}
