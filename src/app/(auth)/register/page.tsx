import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Đăng ký' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; ref?: string }> }) {
  const { callbackUrl, ref } = await searchParams;
  const cb = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/';

  const session = await auth();
  if (session?.user) redirect(cb);

  return <RegisterForm callbackUrl={cb} ref={ref} />;
}
