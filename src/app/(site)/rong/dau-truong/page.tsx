import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { MOI_TRANG_TRAN, lichSuTran, xemSanDau } from '@/lib/rong';
import { SanDau } from '@/components/rong/SanDau';
import { LichSuTran } from '@/components/rong/LichSuTran';

export const metadata: Metadata = { title: 'Đấu trường — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangDauTruong({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/dau-truong');

  const sp = await searchParams;
  // Số trang bịa ra thì về trang 1 — không báo lỗi, cũng không nổ.
  const trang = Math.max(1, Number(sp.trang) || 1);

  const [san, su] = await Promise.all([
    xemSanDau(userId),
    lichSuTran(userId, trang),
  ]);

  return (
    <>
      <h1 className="text-xl font-black">Đấu trường</h1>
      <SanDau d={san} />
      <LichSuTran d={su} trang={trang} moiTrang={MOI_TRANG_TRAN} />
    </>
  );
}
