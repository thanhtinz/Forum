import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { TrangBi } from '@/components/pokemon/TrangBi';

export const metadata: Metadata = { title: 'Trang bị — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangTrangBi() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/trang-bi');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId }, include: { raTran: true } });
  if (!nv) redirect('/pokemon');

  const [hang, tui] = await Promise.all([
    db.pokeHang.findMany({ orderBy: [{ loai: 'asc' }, { cap: 'asc' }, { ma: 'asc' }], take: CONFIG_LIST_CAP }),
    db.pokeDo.findMany({
      where: { nhanVatId: nv.id },
      orderBy: [{ dangMac: 'desc' }, { createdAt: 'asc' }],
      take: CONFIG_LIST_CAP,
    }),
  ]);

  const con = nv.raTran
    ?? (await db.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } }));

  return (
    <section className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-black">Trang bị</h1>
        <span className="retro-sub text-ink-400">{nv.vang.toLocaleString('vi')} vàng · {nv.ngoc.toLocaleString('vi')} ngọc</span>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Bốn ô: vũ khí cộng vào sát thương, còn khiên, mũ và giáp đều cộng vào bộ thủ.
        Chỉ số của đồ đang mặc áp cho con ra trận khi đánh thú hoang và Gym —
        đấu trường thì không, để phần đoán chiêu ở đó không thành cuộc đua mua đồ.
      </p>
      <TrangBi
        cap={nv.cap} vang={nv.vang} ngoc={nv.ngoc}
        con={con && { ten: con.ten, mau: con.mau, mauToiDa: con.mauToiDa,
          c: [con.c1, con.c2, con.c3, con.c4] }}
        hang={hang.map((h) => ({
          ma: h.ma, ten: h.ten, loai: h.loai, cong: h.cong, thu: h.thu, mu: h.mu,
          giap: h.giap, mau: h.mau, cap: h.cap, vang: h.vang, ngoc: h.ngoc,
        }))}
        tui={tui.map((d) => ({
          id: d.id, ten: d.ten, loai: d.loai, cong: d.cong, thu: d.thu, mu: d.mu,
          giap: d.giap, mau: d.mau, dangMac: d.dangMac, sl: d.sl,
        }))} />
    </section>
  );
}
