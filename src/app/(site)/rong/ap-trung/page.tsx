import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemTrung } from '@/lib/rong';
import { LoApTrung } from '@/components/rong/LoApTrung';

export const metadata: Metadata = { title: 'Ấp trứng — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangApTrung() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/ap-trung');

  return (
    <>
      <h1 className="text-xl font-black">Ấp trứng</h1>
      <LoApTrung d={await xemTrung(userId)} />
    </>
  );
}
