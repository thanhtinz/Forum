import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export type AdminSession = { id: string; role: string };

/** Bảo đảm người dùng là ADMIN/MODERATOR. Trả về session hoặc chuyển hướng. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || (role !== 'ADMIN' && role !== 'MODERATOR')) redirect('/');
  return { id: session.user.id, role: role! };
}

/** Chỉ ADMIN (không cho MODERATOR). */
export async function requireSuperAdmin(): Promise<AdminSession> {
  const s = await requireAdmin();
  if (s.role !== 'ADMIN') redirect('/admin');
  return s;
}
