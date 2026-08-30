import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { BangHoi } from '@/components/pokemon/BangHoi';

export const metadata: Metadata = { title: 'Bang hội — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangBang() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/bang');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const cuaToi = nv.bangId
    ? await db.pokeBang.findUnique({
        where: { id: nv.bangId },
        include: {
          thanhVien: { orderBy: { cap: 'desc' }, take: CONFIG_LIST_CAP, select: { id: true, ten: true, cap: true, thangDau: true } },
        },
      })
    : null;

  const danhSach = cuaToi ? [] : await db.pokeBang.findMany({
    orderBy: { createdAt: 'desc' },
    take: CONFIG_LIST_CAP,
    include: {
      truong: { select: { ten: true } },
      _count: { select: { thanhVien: true } },
    },
  });

  return (
    <>
      <section className="dao-tam p-5">
        <h1 className="mb-1 text-xl font-black">Bang hội</h1>
        <p className="mb-4 text-sm text-ink-500">
          Lập bang tốn ngọc, vào bang phải đủ cấp — y bản gốc. Quỹ vàng chung,
          trưởng bang khoá quỹ thì chỉ mình trưởng rút được.
        </p>
        <BangHoi
          toiId={nv.id}
          cap={nv.cap}
          ngoc={nv.ngoc}
          vang={nv.vang}
          bang={cuaToi && {
            id: cuaToi.id, ten: cuaToi.ten, vang: cuaToi.vang, ngoc: cuaToi.ngoc,
            cong: cuaToi.cong, thu: cuaToi.thu, sucChua: cuaToi.sucChua,
            khoaQuy: cuaToi.khoaQuy, truongId: cuaToi.truongId,
            thanhVien: cuaToi.thanhVien,
          }}
          danhSach={danhSach.map((b) => ({
            id: b.id, ten: b.ten, truong: b.truong.ten,
            soNguoi: b._count.thanhVien, sucChua: b.sucChua,
          }))} />
      </section>
    </>
  );
}
