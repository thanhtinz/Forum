import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TaoNhanVat } from '@/components/tutien/TaoNhanVat';

export const metadata: Metadata = { title: 'Lập đạo hiệu — Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

export default async function TrangTao() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/tu-tien/tao');
  // Đã có nhân vật thì không vào lại màn này nữa — một tài khoản một nhân vật.
  if (await db.tienNhanVat.count({ where: { userId } })) redirect('/tu-tien');

  return (
    <>
      <h1 className="text-xl font-black">Vạn Đạo Tu Tiên</h1>
      <TaoNhanVat />
    </>
  );
}
