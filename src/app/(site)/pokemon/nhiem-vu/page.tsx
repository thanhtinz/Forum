import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NHIEM_VU } from '@/lib/pokemon-const';
import { tienDoNhiemVu } from '@/lib/pokemon';
import { BangNhiemVu } from '@/components/pokemon/BangNhiemVu';

export const metadata: Metadata = { title: 'Nhiệm vụ — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangNhiemVu() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/nhiem-vu');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const tienDo = await tienDoNhiemVu(nv.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/pokemon" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Đảo Pokémon
      </Link>
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Chuỗi nhiệm vụ</h1>
          <span className="retro-sub text-ink-400">{nv.nhiemVu}/{NHIEM_VU.length} đã nhận</span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Nhận thưởng theo thứ tự. Tiến độ đọc thẳng từ dữ liệu thật — số thú trong
          kho, huy chương, cấp, số trận thắng — nên không có chỗ nào để lệch.
        </p>
        <BangNhiemVu daNhan={nv.nhiemVu} tienDo={tienDo} />
      </section>
    </div>
  );
}
