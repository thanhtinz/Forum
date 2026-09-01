import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemHang } from '@/lib/rong';
import { HangRong } from '@/components/rong/HangRong';

export const metadata: Metadata = { title: 'Hang Rồng — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangHang() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/hang');

  return (
    <>
      <h1 className="text-xl font-black">Hang Rồng</h1>
      <HangRong d={await xemHang(userId)} />
    </>
  );
}
