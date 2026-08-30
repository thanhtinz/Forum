import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Swords } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DIEM_DOI_QUA, KHU_CHIEN_TRUONG, QUA_LANH_THO, timKhu } from '@/lib/pokemon-const';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { DoiQua } from '@/components/pokemon/DoiQua';

export const metadata: Metadata = { title: 'Lãnh Thổ — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangLanhTho() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/lanh-tho');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const [top, soThu] = await Promise.all([
    db.pokeNhanVat.findMany({
      where: { soDiet: { gt: 0 } },
      orderBy: { soDiet: 'desc' },
      take: 10,
      select: { id: true, ten: true, soDiet: true, cap: true },
    }),
    db.pokeThuHoang.count({ where: { khu: KHU_CHIEN_TRUONG } }),
  ]);
  const khu = timKhu(KHU_CHIEN_TRUONG)!;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/pokemon" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Đảo Pokémon
      </Link>
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">{khu.ten}</h1>
          <span className="retro-sub text-ink-400">
            {nv.diemChien} điểm · đã diệt {nv.soDiet}
          </span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Chiến trường với {soThu} loài — khu đông thú nhất đảo. Mỗi con hạ được cho
          một điểm chiến công và một vạch vào bảng diệt quái. Đủ {DIEM_DOI_QUA} điểm thì
          bốc một phần quà.
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

        <div className="mt-5">
          <h2 className="zib-title mb-3">Bảng diệt quái</h2>
          {top.length === 0 ? (
            <p className="text-sm text-ink-500">Chưa ai hạ con nào ở đây.</p>
          ) : (
            <ol className="space-y-1.5">
              {top.map((t, i) => (
                <li key={t.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  t.id === nv.id ? 'bg-brand-50 dark:bg-brand-950/40' : 'bg-ink-50 dark:bg-ink-800/50'}`}>
                  <span className="w-5 shrink-0 text-xs font-black text-ink-400">{i + 1}</span>
                  <b>{t.ten}</b>
                  <span className="text-xs text-ink-400">cấp {t.cap}</span>
                  <span className="ml-auto tabular-nums">{t.soDiet}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-ink-400">
            Bản gốc xếp bảng này bằng câu {`ORDER BY \`rank\` DESC`} trên toàn bộ nhân vật
            kể cả người chưa diệt con nào — ở đây chỉ tính người đã hạ ít nhất một con.
          </p>
        </div>
        <p className="sr-only">{CONFIG_LIST_CAP}</p>
      </section>
    </div>
  );
}
