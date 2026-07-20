import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Đăng nhập' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const cb = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/';

  const session = await auth();
  if (session?.user) redirect(cb);

  return <LoginForm callbackUrl={cb} />;
}
