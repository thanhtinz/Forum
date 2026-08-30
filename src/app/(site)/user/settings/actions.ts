'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { AnhKhongHopLeError, nhanAnhVaoKho } from '@/lib/nhan-anh';
import { TOGGLEABLE_TYPES, type ToggleableType } from '@/lib/notify-types';

export type SettingsState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Tên hiển thị không được để trống').max(50, 'Tên hiển thị tối đa 50 ký tự'),
  username: z.string().trim().toLowerCase()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(20, 'Tên đăng nhập tối đa 20 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Chỉ dùng chữ thường, số và dấu gạch dưới'),
  bio: z.string().trim().max(300, 'Giới thiệu tối đa 300 ký tự').optional(),
  // Chữ ký dán dưới mọi bài ở diễn đàn, nên phải ngắn — dài quá thì mỗi bài
  // của một người sẽ đẩy bài của người khác ra khỏi màn hình.
  signature: z.string().trim().max(200, 'Chữ ký tối đa 200 ký tự').optional(),
  // Tâm trạng chỉ là một dòng ngắn cạnh tên, dài hơn thì vỡ cột người đăng.
  mood: z.string().trim().max(60, 'Tâm trạng tối đa 60 ký tự').optional(),
  // Không kiểm định dạng ở đây nữa: `nhanAnhVaoKho` vừa kiểm vừa TẢI ẢNH VỀ
  // kho của mình, mà việc ấy phải chạy bất đồng bộ nên không nhét vào lược đồ
  // đồng bộ của zod được.
  image: z.string().trim().optional(),
  cover: z.string().trim().optional(),
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
    signature: formData.get('signature'),
    mood: formData.get('mood'),
    image: formData.get('image'),
    cover: formData.get('cover'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { name, username, bio, signature, mood, image, cover } = parsed.data;

  // Ảnh dán từ ngoài được tải về R2 luôn. Người dùng dán một địa chỉ rồi bên
  // kia đổi ảnh thì ảnh đại diện của họ thành thứ khác — mà mình không biết.
  let anhDaiDien: string | null;
  let anhBia: string | null;
  try {
    anhDaiDien = await nhanAnhVaoKho(image);
    anhBia = await nhanAnhVaoKho(cover);
  } catch (e) {
    return {
      error: e instanceof AnhKhongHopLeError ? e.message : 'Không nhận được ảnh này.',
    };
  }

  const taken = await db.user.findFirst({ where: { username, NOT: { id: session.user.id } }, select: { id: true } });
  if (taken) return { fieldErrors: { username: 'Tên đăng nhập đã có người dùng.' } };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name, username, bio: bio || null, signature: signature || null, mood: mood || null,
      image: anhDaiDien, cover: anhBia,
    },
  });

  revalidatePath('/user/settings');
  revalidatePath('/user/dashboard');
  revalidatePath(`/u/${username}`);
  // Chữ ký nằm dưới mọi bài viết cũ của người này, nên phải làm mới cả khu diễn đàn.
  revalidatePath('/forum', 'layout');
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

/**
 * Bật/tắt từng loại thông báo.
 *
 * Form gửi lên các ô đã BẬT; loại nào không có trong form thì coi như tắt.
 * Chỉ nhận các loại được phép tắt — loại liên quan tới đơn hàng, VIP và thông
 * báo hệ thống luôn giữ nguyên.
 */
export async function updateNotifyPrefs(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const on = new Set(formData.getAll('on').map(String));
  const off: ToggleableType[] = TOGGLEABLE_TYPES.filter((t) => !on.has(t));

  await db.user.update({ where: { id: userId }, data: { notifyOff: off }, select: { id: true } });
  revalidatePath('/user/settings');
  return { ok: true };
}
