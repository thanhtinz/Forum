import Link from 'next/link';
import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { db } from '@/lib/db';
import { MOI_TRANG, docBoLoc, duyetDanhMuc, thanhTruyVan } from '@/lib/danh-muc';
import { HangGame } from '@/components/game/HangGame';
import { HangChip } from '@/components/game/HangChip';
import { PhanTrang } from '@/components/PhanTrang';
import { OTim } from '@/components/vo/OTim';
import { gonSo, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tìm game' };

/*
 * TRANG TÌM.
 *
 * Chưa gõ gì thì KHÔNG để trang trắng: đó là lúc người dùng đang phân vân
 * nhất. Bày ra vài lối gợi ý — thể loại đông game nhất và mấy game tải nhiều —
 * để họ có chỗ bấm thay vì phải nghĩ ra một từ khoá.
 */
export default async function TrangTim({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const loc = docBoLoc(sp);

  if (!loc.tuKhoa) return <ChuaGo />;

  const { game, tong, trang } = await duyetDanhMuc(loc);

  return (
    <div className="space-y-5">
      <div className="lg:hidden"><OTim giaTriDau={loc.tuKhoa} /></div>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Kết quả cho “{loc.tuKhoa}”</h1>
        <p className="phu mt-0.5">{gonSo(tong)} game</p>
      </div>

      {game.length === 0 ? (
        <div className="the p-8 text-center">
          <Search size={24} className="mx-auto text-mo" />
          <p className="mt-2 text-[14px] font-semibold">Không tìm thấy game nào</p>
          <p className="phu mt-1">
            Thử gõ ngắn hơn — chỉ một từ trong tên game thường ra nhiều kết quả hơn cả câu.
          </p>
          <Link href="/yeu-cau" className="nut-xam mt-4">Gửi yêu cầu</Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {game.map((g) => <li key={g.id}><HangGame game={g} /></li>)}
          </ul>
          <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
            dungDuong={(t) => `/tim${thanhTruyVan(loc, { trang: t })}`} />
        </>
      )}
    </div>
  );
}

async function ChuaGo() {
  const [theLoai, taiNhieu] = await Promise.all([
    db.theLoai.findMany({ orderBy: [{ thuTu: 'asc' }], take: 12, select: { ten: true, duongDan: true } }),
    db.game.findMany({
      where: { trangThai: 'DANG_HIEN' },
      orderBy: [{ soLuotTai: 'desc' }, { id: 'desc' }],
      take: 8,
      select: { id: true, ten: true, duongDan: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="lg:hidden"><OTim /></div>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Tìm game</h1>
        <p className="phu mt-0.5">Gõ tên game, tên nhà phát triển, hoặc chọn một lối dưới đây.</p>
      </div>

      <section>
        <h2 className="tieu-de mb-3">Thể loại</h2>
        <HangChip muc={theLoai.map((t) => ({ ten: t.ten, duongDan: `/duyet?the-loai=${t.duongDan}` }))} />
      </section>

      <section>
        <h2 className="tieu-de mb-3">Mọi người hay tìm</h2>
        <ul className="the divide-y divide-vien">
          {taiNhieu.map((g) => (
            <li key={g.id}>
              <Link href={`/game/${g.duongDan}`}
                className="flex items-center gap-3 px-4 py-3 text-[14px] transition-colors hover:bg-nen3">
                <Search size={15} className="shrink-0 text-mo" />
                <span className="truncate">{g.ten}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
