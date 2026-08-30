import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { ChoThu } from '@/components/pokemon/ChoThu';

export const metadata: Metadata = { title: 'Chợ thú — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangCho() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/cho');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const [rao, cuaToi] = await Promise.all([
    db.pokeRao.findMany({
      orderBy: { createdAt: 'desc' },
      take: CONFIG_LIST_CAP,
      include: {
        thu: true,
        nhanVat: { select: { id: true, ten: true } },
      },
    }),
    db.pokeThu.findMany({
      where: { nhanVatId: nv.id, rao: null, NOT: { id: nv.raTranId ?? '' } },
      orderBy: { createdAt: 'desc' },
      take: CONFIG_LIST_CAP,
    }),
  ]);

  return (
    <>
      <section className="dao-tam p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Chợ thú</h1>
          <span className="retro-sub text-ink-400">{nv.ngoc} ngọc</span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Chợ tính bằng ngọc chứ không phải vàng, y bản gốc. Con đang ra trận và con
          cuối cùng trong kho thì không rao được.
        </p>
        <ChoThu
          toiId={nv.id}
          ngoc={nv.ngoc}
          rao={rao.map((k) => ({
            id: k.id, gia: k.gia, cuaToi: k.nhanVatId === nv.id, nguoi: k.nhanVat.ten,
            ten: k.thu.ten, nguon: k.thu.nguon, nac: k.thu.nac, he: k.thu.he,
            cap: k.thu.cap, capCuong: k.thu.capCuong, mauToiDa: k.thu.mauToiDa,
            c: [k.thu.c1, k.thu.c2, k.thu.c3, k.thu.c4],
          }))}
          coTheRao={cuaToi.map((t) => ({
            id: t.id, ten: t.ten, nguon: t.nguon, nac: t.nac, he: t.he,
            cap: t.cap, capCuong: t.capCuong, mauToiDa: t.mauToiDa,
          }))} />
      </section>
    </>
  );
}
