import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Xếp hạng — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

const CO_BAN = 10;

/**
 * Bảng xếp hạng của Đảo Pokémon.
 *
 * Bản gốc (`modules/ratings`) có đúng ba bảng — kinh nghiệm, trận thắng đấu
 * trường, vàng. Giữ nguyên ba bảng ấy và thêm bảng diệt quái ở Lãnh Thổ, vốn
 * bản gốc để lẫn trong trang Lãnh Thổ.
 *
 * KHÔNG dùng chung với bảng xếp hạng của diễn đàn: điểm diễn đàn và vàng
 * trong game là hai thứ khác hẳn nhau, trộn vào là người đọc hiểu nhầm ngay.
 */
export default async function TrangXepHang() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/xep-hang');

  const toi = await db.pokeNhanVat.findUnique({ where: { userId }, select: { id: true } });
  if (!toi) redirect('/pokemon');

  const chon = { id: true, ten: true, cap: true, exp: true, vang: true, thangDau: true, soDiet: true };
  const [theoExp, theoDau, theoVang, theoDiet] = await Promise.all([
    db.pokeNhanVat.findMany({ orderBy: { exp: 'desc' }, take: CO_BAN, select: chon }),
    db.pokeNhanVat.findMany({ where: { thangDau: { gt: 0 } }, orderBy: { thangDau: 'desc' }, take: CO_BAN, select: chon }),
    db.pokeNhanVat.findMany({ orderBy: { vang: 'desc' }, take: CO_BAN, select: chon }),
    db.pokeNhanVat.findMany({ where: { soDiet: { gt: 0 } }, orderBy: { soDiet: 'desc' }, take: CO_BAN, select: chon }),
  ]);

  const bang = [
    { ten: 'Kinh nghiệm', ds: theoExp, so: (x: typeof theoExp[number]) => x.exp },
    { ten: 'Thắng đấu trường', ds: theoDau, so: (x: typeof theoExp[number]) => x.thangDau },
    { ten: 'Vàng', ds: theoVang, so: (x: typeof theoExp[number]) => x.vang },
    { ten: 'Diệt quái ở Lãnh Thổ', ds: theoDiet, so: (x: typeof theoExp[number]) => x.soDiet },
  ];

  return (
    <div className="space-y-4">
      <Link href="/pokemon" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Đảo Pokémon
      </Link>
      <h1 className="text-xl font-black">Xếp hạng Đảo Pokémon</h1>

      {bang.map((b) => (
        <section key={b.ten} className="card p-5">
          <h2 className="zib-title mb-3">{b.ten}</h2>
          {b.ds.length === 0 ? (
            <p className="text-sm text-ink-500">Chưa có ai.</p>
          ) : (
            <ol className="space-y-1.5">
              {b.ds.map((x, i) => (
                <li key={x.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  x.id === toi.id ? 'bg-brand-50 dark:bg-brand-950/40' : 'bg-ink-50 dark:bg-ink-800/50'}`}>
                  <span className="w-5 shrink-0 text-xs font-black text-ink-400">{i + 1}</span>
                  <b>{x.ten}</b>
                  <span className="text-xs text-ink-400">cấp {x.cap}</span>
                  <span className="ml-auto tabular-nums">{b.so(x).toLocaleString('vi')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
