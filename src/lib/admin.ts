import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';

export interface AdminUser {
  id: string;
  role: Role;
}

/** Trả về admin/mod đang đăng nhập, hoặc đá về trang chủ. Dùng trong Server Component. */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) redirect('/');
  return { id: user.id, role: user.role };
}

/** Bản dùng trong Server Action: ném lỗi thay vì redirect. */
export async function assertAdmin(): Promise<AdminUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    throw new Error('FORBIDDEN');
  }
  return { id: user.id, role: user.role };
}
