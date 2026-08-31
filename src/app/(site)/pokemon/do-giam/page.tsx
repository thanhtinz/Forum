import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { KHU } from '@/lib/pokemon-const';
import { DoGiam } from '@/components/pokemon/DoGiam';

export const metadata: Metadata = { title: 'Đồ Giám — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

/**
 * Đồ Giám — sổ 468 loài, con nào đã gặp, con nào đã bắt.
 *
 * Bản gốc không có trang này. Đảo có gần năm trăm loài mà không có chỗ nào
 * nhìn lại được, nên bộ ảnh chỉ loé lên vài giây trong lúc đánh rồi thôi.
 */
export default async function TrangDoGiam() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/do-giam');

  const nv = await db.pokeNhanVat.findUnique({
    where: { userId }, select: { id: true, mocDoGiam: true },
  });
  if (!nv) redirect('/pokemon');

  // Danh sách loài dựng từ chính bảng thú hoang: một loài có mặt ở nhiều khu
  // thì tính về khu đầu tiên gặp trong thứ tự KHU, để mỗi con chỉ đứng một chỗ.
  const [hoang, daGhi] = await Promise.all([
    db.pokeThuHoang.findMany({
      select: { khu: true, nguon: true, ten: true, he: true },
      orderBy: [{ nguon: 'asc' }],
      take: 1000,
    }),
    db.pokeDoGiam.findMany({
      where: { nhanVatId: nv.id },
      select: { nguon: true, daBat: true },
      take: 1000,
    }),
  ]);

  const thuTuKhu = new Map(KHU.map((k, i) => [k.ma as string, i]));
  const gop = new Map<number, { nguon: number; ten: string; he: number; khu: string }>();
  for (const h of hoang) {
    const cu = gop.get(h.nguon);
    if (!cu || (thuTuKhu.get(h.khu) ?? 99) < (thuTuKhu.get(cu.khu) ?? 99)) {
      gop.set(h.nguon, { nguon: h.nguon, ten: h.ten, he: h.he, khu: h.khu });
    }
  }

  const trangThai = new Map(daGhi.map((d) => [d.nguon, d.daBat]));
  const loai = [...gop.values()].map((l) => ({
    ...l,
    gap: trangThai.has(l.nguon),
    bat: trangThai.get(l.nguon) === true,
  }));

  return (
    <section className="dao-tam p-5">
      <DoGiam loai={loai} khu={KHU.map((k) => ({ ma: k.ma, ten: k.ten, bac: k.bac }))}
        daNhanMoc={nv.mocDoGiam} />
    </section>
  );
}
