import Link from 'next/link';
import type { Metadata } from 'next';
import { Backpack, Cross, Flame, Medal, ScrollText, ShoppingBasket, Store, Swords, Trophy, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { KHU, O_TRANG_BI, canVaoKhu, congTrangBi, dauNgayVN, timKhu } from '@/lib/pokemon-const';
import { DaoPokemon } from '@/components/pokemon/DaoPokemon';
import { DiemDanh } from '@/components/pokemon/DiemDanh';

export const metadata: Metadata = {
  title: 'Đảo Pokémon',
  description: 'Đi khắp hai mươi khu, đánh và bắt 468 con thú, nuôi lớn rồi cho tiến hoá.',
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
        <p className="dao-tam mt-4 p-5 text-sm text-ink-500">
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

  // Số loài trong khu đang đứng; huy chương và nhiệm vụ thì thanh tab ở
  // layout tự lo.
  const soTrongKhu = await db.pokeThuHoang.count({ where: { khu: nv.khu } });

  // Thuốc trong túi để dùng ngay giữa trận, gộp theo món.
  const thuoc = await db.pokeDo.findMany({
    where: { nhanVatId: nv.id, loai: 'elixir', sl: { gt: 0 } },
    select: { id: true, ten: true, mau: true, sl: true },
    orderBy: { mau: 'asc' },
    take: 8,
  });

  // Trang bị đang mặc, để bản xem trước sát thương khớp với thứ máy chủ tính.
  const dangMac = await db.pokeDo.findMany({
    where: { nhanVatId: nv.id, dangMac: true },
    select: { cong: true, thu: true, mu: true, giap: true },
    take: O_TRANG_BI.length,
  });

  const khu = timKhu(nv.khu) ?? KHU[0];

  // Đã điểm danh hôm nay chưa — cắt theo ngày lịch giờ Việt Nam.
  const xongDiemDanh = nv.diemDanhNgay != null
    && nv.diemDanhNgay.getTime() >= dauNgayVN(new Date()).getTime();

  return (
    <>
      {/* Nhận rồi thì thôi không bày nữa: một tấm thẻ chỉ để nói "hôm nay xong
          rồi" mà chiếm chỗ trên đầu bản đồ suốt cả ngày là phiền. */}
      {!xongDiemDanh && <DiemDanh chuoi={nv.diemDanhChuoi} xong={false} />}
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
        khuMo={KHU.map((k) => ({ ...k, chan: canVaoKhu(k.bac, k.ma, nv.cap, nv.huyChuong) }))}
        thuoc={thuoc}
        boTrangBi={congTrangBi(dangMac)}
      />
    </>
  );
}

function GioiThieu() {
  return (
    <section className="dao-tam p-5">
      <h1 className="mb-2 text-xl font-black">Đảo Pokémon</h1>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Dựng lại từ một wap game Pokémon Việt hoá chạy trên JohnCMS quãng 2013:
        mười lăm khu gốc với đúng chỉ số và bộ ảnh cũ, mười bảy hệ khắc chế
        nhau, bắt bằng quả cầu rồi nuôi lớn cho tiến hoá — cộng thêm năm khu
        mới mở sau Hang Huyền Thoại, tổng cộng 468 con thú hoang.
      </p>
    </section>
  );
}
