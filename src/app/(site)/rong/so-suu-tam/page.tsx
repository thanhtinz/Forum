import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemSuuTam } from '@/lib/rong';
import { SoSuuTam } from '@/components/rong/SoSuuTam';

export const metadata: Metadata = { title: 'Sổ sưu tầm — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangSoSuuTam() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/so-suu-tam');

  return (
    <>
      <h1 className="text-xl font-black">Sổ sưu tầm</h1>
      <SoSuuTam d={await xemSuuTam(userId)} />
    </>
  );
}
