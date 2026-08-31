import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Swords } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DIEM_DOI_QUA, KHU_CHIEN_TRUONG, QUA_LANH_THO, timKhu } from '@/lib/pokemon-const';
import { DoiQua } from '@/components/pokemon/DoiQua';

export const metadata: Metadata = { title: 'Lãnh Thổ — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangLanhTho() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/lanh-tho');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const soThu = await db.pokeThuHoang.count({ where: { khu: KHU_CHIEN_TRUONG } });
  const khu = timKhu(KHU_CHIEN_TRUONG)!;

  return (
    <>
      <section className="dao-tam p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">{khu.ten}</h1>
          <span className="retro-sub text-ink-400">
            {nv.diemChien} điểm · đã diệt {nv.soDiet}
          </span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Chiến trường với {soThu} loài — khu đông thú nhất đảo. Mỗi con hạ được cho
          một điểm chiến công và một vạch vào bảng xếp hạng diệt quái. Đủ {DIEM_DOI_QUA} điểm
          thì bốc một phần quà.
        </p>

        {nv.khu === KHU_CHIEN_TRUONG ? (
          <Link href="/pokemon" className="btn-primary mb-4 w-full justify-center gap-1.5">
            <Swords size={15} /> Bạn đang ở Lãnh Thổ — vào tìm thú
          </Link>
        ) : (
          <p className="mb-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-800/50">
            Bạn chưa đứng ở Lãnh Thổ. Chọn khu này ở{' '}
            <Link href="/pokemon" className="font-semibold text-brand-600 hover:underline">trang chính</Link>
            {' '}rồi đánh, điểm mới được tính.
          </p>
        )}

        <DoiQua diem={nv.diemChien} qua={QUA_LANH_THO.map((q) => q.ten)} />
      </section>
    </>
  );
}
