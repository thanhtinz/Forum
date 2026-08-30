import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { KhoThu } from '@/components/pokemon/KhoThu';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Kho thú — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangKho() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/kho');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const thu = await db.pokeThu.findMany({
    where: { nhanVatId: nv.id },
    orderBy: [{ cap: 'desc' }, { createdAt: 'asc' }],
    take: CONFIG_LIST_CAP,
  });

  return (
    <>
      <section className="dao-tam p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Kho thú</h1>
          <span className="retro-sub text-ink-400">{thu.length} con · {nv.da} đá tiến cấp</span>
        </div>
        <KhoThu
          raTranId={nv.raTranId}
          coDa={nv.da}
          thu={thu.map((t) => ({
            id: t.id, ten: t.ten, nguon: t.nguon, nac: t.nac, nacToiDa: t.nacToiDa,
            he: t.he, cap: t.cap, exp: t.exp, mau: t.mau, mauToiDa: t.mauToiDa,
            c: [t.c1, t.c2, t.c3, t.c4], chieu: t.chieu,
          }))} />
      </section>
    </>
  );
}
