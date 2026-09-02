import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { chotBeQuan, xemNhanVat, xemO } from '@/lib/tu-tien';
import { ManThe } from '@/components/tutien/ManThe';
import { DIA_DIEM_DAU } from '@/lib/tu-tien-const';

export const metadata: Metadata = { title: 'Thế giới — Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

export default async function TrangTheGioi() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/tu-tien/the-gioi');

  await chotBeQuan(userId);
  const nv = await xemNhanVat(userId);
  if (!nv) redirect('/tu-tien');

  // Ô lưu trong sổ mà không còn trên bản đồ (đổi dữ liệu chẳng hạn) thì đưa về
  // ô đầu, chứ không để trang trắng.
  const o = xemO(nv.viTri) ?? xemO(DIA_DIEM_DAU);
  if (!o) redirect('/tu-tien');

  return (
    <>
      <h1 className="text-xl font-black">Thế giới</h1>
      <ManThe nv={nv} o={o} />
    </>
  );
}
