import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemCuaHang } from '@/lib/rong';
import { CuaHang } from '@/components/rong/CuaHang';

export const metadata: Metadata = { title: 'Cửa hàng — Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function TrangCuaHang() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/rong/cua-hang');

  return (
    <>
      <h1 className="text-xl font-black">Cửa hàng</h1>
      <CuaHang d={await xemCuaHang(userId)} />
    </>
  );
}
