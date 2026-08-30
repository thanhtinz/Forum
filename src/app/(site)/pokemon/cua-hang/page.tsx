import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CuaHangPoke } from '@/components/pokemon/CuaHangPoke';

export const metadata: Metadata = { title: 'Cửa hàng — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangCuaHang() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/cua-hang');
  const nv = await db.pokeNhanVat.findUnique({
    where: { userId }, select: { vang: true, cau: true, da: true, ngoc: true },
  });
  if (!nv) redirect('/pokemon');

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/pokemon" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Đảo Pokémon
      </Link>
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Cửa hàng</h1>
          <span className="retro-sub text-ink-400">{nv.vang} vàng · {nv.ngoc} ngọc</span>
        </div>
        <CuaHangPoke vang={nv.vang} cau={nv.cau} da={nv.da} ngoc={nv.ngoc} />
      </section>
    </div>
  );
}
