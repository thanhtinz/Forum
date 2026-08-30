import Link from 'next/link';
import type { Metadata } from 'next';
import { Backpack, Cross, Medal, Store, Swords } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { KHU, capVaoKhu, timKhu } from '@/lib/pokemon-const';
import { DaoPokemon } from '@/components/pokemon/DaoPokemon';

export const metadata: Metadata = {
  title: 'Đảo Pokémon',
  description: 'Đi khắp mười bốn khu, đánh và bắt 318 con thú, nuôi lớn rồi cho tiến hoá.',
};
export const dynamic = 'force-dynamic';

/**
 * Đảo Pokémon — trang riêng, KHÔNG nằm trong khu giải trí.
 *
 * Khu giải trí là mấy trò bấm một cái ăn thua ngay; đây là một game dài có
 * nhân vật, kho thú và tiến trình, đúng cỡ nông trại. Trộn vào đấy là lẫn hai
 * thứ khác hẳn nhau.
 */
export default async function TrangPokemon() {
  const s = await auth();
  const userId = s?.user?.id ?? null;

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl">
        <GioiThieu />
        <p className="card mt-4 p-5 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/pokemon" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để lên đảo.
        </p>
      </div>
    );
  }

  const nv = await db.pokeNhanVat.findUnique({
    where: { userId },
    include: { raTran: true, tran: true },
  });
  if (!nv) {
    return (
      <div className="mx-auto max-w-2xl">
        <GioiThieu />
        <Link href="/pokemon/tao" className="btn-primary mt-4 w-full justify-center">
          Tạo nhân vật
        </Link>
      </div>
    );
  }

  // Con ra trận: chưa chọn thì lấy con đầu tiên trong kho.
  const raTran = nv.raTran
    ?? (await db.pokeThu.findFirst({ where: { nhanVatId: nv.id }, orderBy: { createdAt: 'asc' } }));

  const [soThu, soTrongKhu] = await Promise.all([
    db.pokeThu.count({ where: { nhanVatId: nv.id } }),
    db.pokeThuHoang.count({ where: { khu: nv.khu } }),
  ]);

  const khu = timKhu(nv.khu) ?? KHU[0];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-black">Đảo Pokémon</h1>
        <nav className="flex gap-2">
          <Link href="/pokemon/kho" className="btn-outline !py-1.5 text-sm">
            <Backpack size={14} /> Kho ({soThu})
          </Link>
          <Link href="/pokemon/gym" className="btn-outline !py-1.5 text-sm">
            <Medal size={14} /> Gym ({nv.huyChuong}/14)
          </Link>
          <Link href="/pokemon/dau-truong" className="btn-outline !py-1.5 text-sm">
            <Swords size={14} /> Đấu trường
          </Link>
          <Link href="/pokemon/cua-hang" className="btn-outline !py-1.5 text-sm">
            <Store size={14} /> Cửa hàng
          </Link>
          <Link href="/pokemon/y-te" className="btn-outline !py-1.5 text-sm">
            <Cross size={14} /> Trạm y tế
          </Link>
        </nav>
      </div>

      <DaoPokemon
        nv={{
          ten: nv.ten, vang: nv.vang, exp: nv.exp, cap: nv.cap,
          sk: nv.sk, skToiDa: nv.skToiDa, cau: nv.cau, da: nv.da, khu: nv.khu,
          ngoc: nv.ngoc, huyChuong: nv.huyChuong,
        }}
        raTran={raTran && {
          id: raTran.id, ten: raTran.ten, nguon: raTran.nguon, nac: raTran.nac,
          he: raTran.he, cap: raTran.cap, exp: raTran.exp,
          mau: raTran.mau, mauToiDa: raTran.mauToiDa,
          chieu: raTran.chieu, c: [raTran.c1, raTran.c2, raTran.c3, raTran.c4],
        }}
        tran={nv.tran && {
          ten: nv.tran.ten, nguon: nv.tran.nguon, nac: nv.tran.nac, he: nv.tran.he,
          mau: nv.tran.mau, mauToiDa: nv.tran.mauToiDa,
          cong: nv.tran.cong, thu: nv.tran.thu, exp: nv.tran.exp, vang: nv.tran.vang,
          ke: nv.tran.ke, gym: nv.tran.gym,
        }}
        khuHienTai={{ ...khu }}
        soTrongKhu={soTrongKhu}
        khuMo={KHU.map((k) => ({ ...k, mo_cap: capVaoKhu(k.bac) }))}
      />
    </div>
  );
}

function GioiThieu() {
  return (
    <section className="card p-5">
      <h1 className="mb-2 text-xl font-black">Đảo Pokémon</h1>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Dựng lại từ một wap game Pokémon Việt hoá chạy trên JohnCMS quãng 2013:
        mười bốn khu, 318 con thú hoang với đúng chỉ số và bộ ảnh gốc, mười bảy
        hệ khắc chế nhau, bắt bằng quả cầu rồi nuôi lớn cho tiến hoá.
      </p>
    </section>
  );
}
