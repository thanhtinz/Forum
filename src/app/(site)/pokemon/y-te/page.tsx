import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS } from '@/lib/pokemon-const';
import { TramYTe } from '@/components/pokemon/TramYTe';

export const metadata: Metadata = { title: 'Trạm y tế — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangYTe() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/y-te');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId }, include: { raTran: true } });
  if (!nv) redirect('/pokemon');

  const con = nv.raTran
    ?? (await db.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } }));

  const luc = nv.chuaLuc?.getTime() ?? 0;
  return (
    <div className="mx-auto max-w-lg">
      <section className="card p-5">
        <h1 className="mb-1 text-xl font-black">Trạm y tế</h1>
        <p className="mb-4 text-sm text-ink-500">
          Y tá hồi {YTE_MAU} máu mỗi {YTE_MAU_CHO_MS / 60_000} phút, hoặc {YTE_SK} thể lực
          mỗi {YTE_SK_CHO_MS / 60_000} phút. Bản gốc để hai việc này dùng chung một lần
          chờ, nên chữa xong cái này là phải đợi mới làm được cái kia.
        </p>
        <TramYTe
          chuaLuc={luc}
          sk={nv.sk} skToiDa={nv.skToiDa}
          thu={con && { ten: con.ten, nguon: con.nguon, nac: con.nac, he: con.he, mau: con.mau, mauToiDa: con.mauToiDa }} />
      </section>
    </div>
  );
}
