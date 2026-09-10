import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { CACH_SAP, MOI_TRANG, docBoLoc, duyetKho, thanhTruyVan } from '@/lib/kho-game';
import { HangGame } from '@/components/game/HangGame';
import { HangChip } from '@/components/game/HangChip';
import { PhanTrang } from '@/components/PhanTrang';
import { HE_MAY, MO_TA_HE } from '@/lib/he-may';
import { gop, gonSo, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Duyệt kho' };

/*
 * TRANG DUYỆT — danh sách dọc, mỗi game một hàng.
 *
 * Không dùng lưới thẻ vuông ở đây: người vào trang duyệt là người đang SO
 * SÁNH, mà so sánh thì cần thể loại, điểm sao và nút cài nằm cạnh nhau trên
 * cùng một dòng. Lưới thẻ chỉ khoe được cái biểu tượng.
 */
export default async function TrangDuyet({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const loc = docBoLoc(sp);
  const [{ game, tong, trang }, theLoai] = await Promise.all([
    duyetKho(loc),
    db.theLoai.findMany({ orderBy: [{ thuTu: 'asc' }], take: 24, select: { ten: true, duongDan: true } }),
  ]);

  const chipHe = [
    { ten: 'Mọi hệ máy', duongDan: `/duyet${thanhTruyVan({ ...loc, he: undefined, trang: 1 })}` },
    ...HE_MAY.map((h) => ({
      ten: MO_TA_HE[h].ten,
      duongDan: `/duyet${thanhTruyVan({ ...loc, he: h, trang: 1 })}`,
    })),
  ];
  const chonHe = `/duyet${thanhTruyVan({ ...loc, trang: 1 })}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Duyệt kho</h1>
        <p className="phu mt-0.5">{gonSo(tong)} game khớp với lựa chọn của bạn</p>
      </div>

      <HangChip muc={chipHe} dangChon={chonHe} />

      {/* Thể loại tách thành hàng riêng: gộp chung với hệ máy thì hai loại lựa
          chọn khác hẳn nhau nằm lẫn vào nhau, bấm nhầm là chuyện thường. */}
      <HangChip
        muc={[
          { ten: 'Mọi thể loại', duongDan: `/duyet${thanhTruyVan({ ...loc, theLoai: undefined, trang: 1 })}` },
          ...theLoai.map((t) => ({
            ten: t.ten,
            duongDan: `/duyet${thanhTruyVan({ ...loc, theLoai: t.duongDan, trang: 1 })}`,
          })),
        ]}
        dangChon={chonHe}
      />

      <div className="flex flex-wrap items-center gap-2">
        {CACH_SAP.map((c) => (
          <Link key={c.ma} href={`/duyet${thanhTruyVan({ ...loc, sap: c.ma, trang: 1 })}`}
            className={gop('chip', c.ma === loc.sap && 'chip-chon')}>
            {c.ten}
          </Link>
        ))}
        <Link href={`/duyet${thanhTruyVan({ ...loc, vietHoa: loc.vietHoa ? undefined : true, trang: 1 })}`}
          className={gop('chip', loc.vietHoa && 'chip-chon')}>
          Có bản Việt hoá
        </Link>
      </div>

      {game.length === 0 ? (
        <div className="the p-8 text-center">
          <p className="text-[14px] font-semibold">Không có game nào khớp</p>
          <p className="phu mt-1">Thử bỏ bớt một bộ lọc, hoặc nhắn cho ban quản kho.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/duyet" className="nut-xam">Bỏ hết bộ lọc</Link>
            <Link href="/yeu-cau" className="nut-vien">Yêu cầu game</Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {game.map((g) => <li key={g.id}><HangGame game={g} /></li>)}
          </ul>
          <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
            dungDuong={(t) => `/duyet${thanhTruyVan(loc, { trang: t })}`} />
        </>
      )}
    </div>
  );
}
