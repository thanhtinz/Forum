import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Đăng ký' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; ref?: string }> }) {
  const { callbackUrl, ref } = await searchParams;
  // Loại `//…` ra, không chỉ kiểm dấu gạch đầu: `?callbackUrl=//evil.com`
  // là một địa chỉ NGOÀI theo giao thức hiện tại, nhận vào là biến trang
  // đăng nhập thành bàn đạp chuyển hướng sang chỗ khác. `layTiepDuong`
  // trong `(auth)/actions.ts` đã chặn đúng cách, hai trang này thì chưa.
  const cb = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
    ? callbackUrl : '/';

  const session = await auth();
  if (session?.user) redirect(cb);

  return <RegisterForm callbackUrl={cb} inviteCode={ref} />;
}
