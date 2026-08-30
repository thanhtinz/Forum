import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { CuongHoa } from '@/components/pokemon/CuongHoa';

export const metadata: Metadata = { title: 'Cường hoá — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangCuongHoa() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/cuong-hoa');

  const nv = await db.pokeNhanVat.findUnique({
    where: { userId },
    include: { huyenTinh: { orderBy: { cap: 'asc' } } },
  });
  if (!nv) redirect('/pokemon');

  const thu = await db.pokeThu.findMany({
    where: { nhanVatId: nv.id },
    orderBy: [{ capCuong: 'desc' }, { cap: 'desc' }],
    take: CONFIG_LIST_CAP,
  });

  return (
    <>
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Lò cường hoá</h1>
          <span className="retro-sub text-ink-400">{nv.vang} vàng · {nv.ngoc} ngọc</span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Dùng viên huyền tinh cấp n để nâng một con từ cường hoá n−1 lên n, mỗi cấp
          cộng thẳng vào máu tối đa. Cấp 1–5 chắc ăn; cấp 6 chỉ được nửa, hỏng thì
          tụt một cấp.
        </p>
        <CuongHoa
          vang={nv.vang} ngoc={nv.ngoc}
          kho={nv.huyenTinh.map((h) => ({ cap: h.cap, sl: h.sl }))}
          thu={thu.map((t) => ({
            id: t.id, ten: t.ten, nguon: t.nguon, nac: t.nac, he: t.he,
            capCuong: t.capCuong, mau: t.mau, mauToiDa: t.mauToiDa,
          }))} />
      </section>
    </>
  );
}
