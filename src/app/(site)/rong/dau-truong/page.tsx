import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemSanDau } from '@/lib/rong';
import { SanDau } from '@/components/rong/SanDau';

export const metadata: Metadata = { title: 'Đấu trường — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangDauTruong() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/dau-truong');

  return (
    <>
      <h1 className="text-xl font-black">Đấu trường</h1>
      <SanDau d={await xemSanDau(userId)} />
    </>
  );
}
