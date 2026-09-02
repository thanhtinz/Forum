import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { chotBeQuan, xemNhanVat } from '@/lib/tu-tien';
import { DoKiep } from '@/components/tutien/DoKiep';

export const metadata: Metadata = { title: 'Độ kiếp — Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

/**
 * Chuẩn bị Thiên kiếp.
 *
 * Trang này KHÔNG chặn người chưa đủ điều kiện: blueprint mục 9 đòi người
 * chuẩn bị đột phá phải biết "điều kiện còn thiếu", mà đá họ về trang chính
 * thì chẳng biết thiếu gì. Vào sớm thì thấy checklist đỏ và đường đi để bù —
 * còn cái nút thì máy chủ vẫn khoá, kiểm lại từ đầu trong `doThienKiep`.
 */
export default async function TrangDoKiep() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/tu-tien/do-kiep');

  await chotBeQuan(userId);
  const nv = await xemNhanVat(userId);
  if (!nv) redirect('/tu-tien');

  return (
    <>
      <h1 className="text-xl font-black">Độ kiếp</h1>
      <DoKiep nv={nv} />
    </>
  );
}
