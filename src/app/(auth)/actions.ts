'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { rateLimit } from '@/lib/rate-limit-memory';

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

/** Số tài khoản tối đa tạo được từ một địa chỉ IP trong một ngày. */
const DANG_KY_MOI_NGAY = 3;

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

  // Chặn số lần đăng ký từ cùng một địa chỉ IP.
  //
  // Nói thẳng giới hạn của lớp này: bộ đếm nằm trong bộ nhớ tiến trình nên mất
  // khi khởi động lại và không dùng chung giữa nhiều máy chủ. Nó chỉ là rào
  // chắn tiện tay cho việc nuôi tài khoản bằng script; rào thật nằm ở chỗ phần
  // thưởng giới thiệu chỉ trả khi người được mời đăng bài đầu tiên.
  const { ip } = await getActor();
  if (ip) {
    const cho = rateLimit(`dangky:${ip}`, DANG_KY_MOI_NGAY, 86400);
    if (!cho.ok) {
      return { error: 'Đã tạo quá nhiều tài khoản từ máy này hôm nay. Thử lại vào ngày mai nhé.' };
    }
  }

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
  const created = await db.user.create({
    data: { username, email, name: username, passwordHash, inviteCode: newInviteCode(username), invitedById },
    select: { id: true },
  });

  // Người giới thiệu KHÔNG được thưởng ở đây. Tạo tài khoản trống chẳng tốn gì,
  // nên trả điểm ngay lúc đăng ký là biến việc mời thành máy in điểm. Phần
  // thưởng chuyển sang lúc người được mời đăng bài đầu tiên — xem
  // `thuongNguoiMoi` trong `src/lib/invite.ts`.

  try {
    await signIn('credentials', { identifier: email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Đăng ký thành công nhưng đăng nhập tự động thất bại. Hãy đăng nhập lại.' };
    throw e;
  }
  return {};
}

/** Đăng xuất và quay về trang chủ. */
export async function logout() {
  await signOut({ redirectTo: '/' });
}
