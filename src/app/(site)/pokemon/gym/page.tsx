import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SO_GYM } from '@/lib/pokemon-const';
import { BangGym } from '@/components/pokemon/BangGym';

export const metadata: Metadata = { title: 'Gym — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangGym() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/gym');

  const nv = await db.pokeNhanVat.findUnique({
    where: { userId }, include: { tran: true, raTran: true },
  });
  if (!nv) redirect('/pokemon');

  const con = nv.raTran
    ?? (await db.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } }));

  const gym = await db.pokeGym.findMany({ orderBy: { so: 'asc' }, take: SO_GYM });

  return (
    <>
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Mười bốn Gym</h1>
          <span className="retro-sub text-ink-400">{nv.huyChuong}/{SO_GYM} huy chương</span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Đánh theo thứ tự: hạ xong Gym này mới vào được Gym sau. Thắng thì được
          vàng, kinh nghiệm, quả cầu, ngọc, một con thú tặng và một huy chương.
          Chủ Gym không bắt được.
        </p>
        <BangGym
          daHa={nv.huyChuong}
          dangDanh={!!nv.tran}
          con={con && {
            ten: con.ten, he: con.he, mau: con.mau,
            c: [con.c1, con.c2, con.c3, con.c4],
          }}
          gym={gym.map((g) => ({
            so: g.so, ten: g.ten, he: g.he, cong: g.cong, thu: g.thu, mau: g.mau,
            exp: g.exp, vang: g.vang, cau: g.cau, ngoc: g.ngoc, tangNguon: g.tangNguon,
          }))} />
      </section>
    </>
  );
}
