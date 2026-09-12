import Link from 'next/link';
import type { Metadata } from 'next';
import { X } from 'lucide-react';
import { db } from '@/lib/db';
import { CACH_SAP, DANG_HIEN, MOI_TRANG, docBoLoc, duyetDanhMuc, thanhTruyVan } from '@/lib/danh-muc';
import { HangGame } from '@/components/game/HangGame';
import { HangChip } from '@/components/game/HangChip';
import { CotLoc, type NhomLoc } from '@/components/game/CotLoc';
import { PhanTrang } from '@/components/PhanTrang';
import { HE_MAY, MO_TA_HE } from '@/lib/he-may';
import { gonSo, gop, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tất cả trò chơi' };

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

  const [{ game, tong, trang }, theLoai, soTheoHe] = await Promise.all([
    duyetDanhMuc(loc),
    db.theLoai.findMany({
      orderBy: [{ thuTu: 'asc' }],
      take: 24,
      select: {
        ten: true, duongDan: true,
        _count: { select: { game: { where: { game: DANG_HIEN } } } },
      },
    }),
    Promise.all(HE_MAY.map((h) =>
      db.game.count({ where: { ...DANG_HIEN, banTai: { some: { heMay: h } } } }))),
  ]);

  const duong = (doi: Parameters<typeof thanhTruyVan>[1]) => `/duyet${thanhTruyVan({ ...loc, trang: 1 }, doi)}`;

  /*
   * Bộ lọc ĐANG BẬT, gom thành chip gỡ được.
   *
   * Cột lọc bên trái có đánh dấu mục đang chọn, nhưng nó nằm tách khỏi kết quả
   * và phải cuộn mới thấy hết. Cuộn tới cuối trang rồi tự hỏi "sao có mỗi bốn
   * game" là chuyện xảy ra suốt, vì bộ lọc gây ra điều đó nằm khuất phía trên.
   * Hàng chip này đứng ngay trên kết quả, nói thẳng "đang lọc những thứ này",
   * và mỗi chip gỡ được đúng một điều kiện.
   */
  const dangLoc: { ten: string; bo: string }[] = [
    ...(loc.he ? [{ ten: MO_TA_HE[loc.he].ten, bo: duong({ he: undefined }) }] : []),
    ...(loc.theLoai
      ? [{
          ten: theLoai.find((t) => t.duongDan === loc.theLoai)?.ten ?? loc.theLoai,
          bo: duong({ theLoai: undefined }),
        }]
      : []),
    ...(loc.vietHoa ? [{ ten: 'Có bản Việt hoá', bo: duong({ vietHoa: undefined }) }] : []),
  ];

  const nhom: NhomLoc[] = [
    {
      ten: 'Hệ máy',
      muc: [
        { ten: 'Mọi hệ máy', duongDan: duong({ he: undefined }), chon: !loc.he },
        ...HE_MAY.map((h, i) => ({
          ten: MO_TA_HE[h].ten, duongDan: duong({ he: h }), so: soTheoHe[i], chon: loc.he === h,
        })),
      ],
    },
    {
      ten: 'Thể loại',
      muc: [
        { ten: 'Mọi thể loại', duongDan: duong({ theLoai: undefined }), chon: !loc.theLoai },
        ...theLoai.map((t) => ({
          ten: t.ten, duongDan: duong({ theLoai: t.duongDan }), so: t._count.game,
          chon: loc.theLoai === t.duongDan,
        })),
      ],
    },
    {
      ten: 'Sắp xếp',
      muc: CACH_SAP.map((c) => ({
        ten: c.ten, duongDan: duong({ sap: c.ma }), chon: loc.sap === c.ma,
      })),
    },
    {
      ten: 'Khác',
      muc: [{
        ten: 'Có bản Việt hoá',
        duongDan: duong({ vietHoa: loc.vietHoa ? undefined : true }),
        chon: !!loc.vietHoa,
      }],
    },
  ];

  return (
    /*
      CỘT LỌC ĐẶT SAU TRONG DOM, KÉO SANG TRÁI BẰNG CSS.
      Mấy tiêu đề nhóm lọc là h2, nên để cột này lên trước thì h2 xuất hiện
      trước h1 của trang — bộ đọc màn hình duyệt theo đầu đề sẽ gặp "Hệ máy"
      trước khi gặp "Tất cả trò chơi", và mất luôn chỗ để biết đang ở trang gì.
      `order` chỉ đổi chỗ lúc VẼ, không đổi thứ tự đọc.
    */
    <div className="lg:flex lg:gap-8">

      <div className="min-w-0 flex-1 space-y-4 lg:order-2">
        <div>
          <h1 className="tieu-de-trang">Tất cả trò chơi</h1>
          <p className="phu mt-0.5">{gonSo(tong)} game khớp với lựa chọn của bạn</p>
        </div>

        {dangLoc.length > 0 && (
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            {dangLoc.map((d) => (
              <Link key={d.bo} href={d.bo} className="chip chip-chon gap-1"
                aria-label={`Bỏ lọc ${d.ten}`}>
                {d.ten} <X size={13} aria-hidden />
              </Link>
            ))}
            {dangLoc.length > 1 && (
              <Link href={duong({ he: undefined, theLoai: undefined, vietHoa: undefined })}
                className="text-[12px] font-semibold text-mo hover:text-chu hover:underline">
                Bỏ hết
              </Link>
            )}
          </div>
        )}

        {/* Bộ lọc trên ĐIỆN THOẠI: hai hàng chip cuộn ngang. Cột lọc bên trái
            ẩn hẳn ở khổ này, nên đây là lối duy nhất — không được thiếu thứ gì
            mà cột kia có. */}
        <div className="space-y-2 lg:hidden">
          <HangChip
            muc={[
              { ten: 'Mọi hệ máy', duongDan: duong({ he: undefined }) },
              ...HE_MAY.map((h) => ({ ten: MO_TA_HE[h].ten, duongDan: duong({ he: h }) })),
            ]}
            dangChon={loc.he ? duong({ he: loc.he }) : duong({ he: undefined })}
          />
          <HangChip
            muc={[
              { ten: 'Mọi thể loại', duongDan: duong({ theLoai: undefined }) },
              ...theLoai.map((t) => ({ ten: t.ten, duongDan: duong({ theLoai: t.duongDan }) })),
            ]}
            dangChon={loc.theLoai ? duong({ theLoai: loc.theLoai }) : duong({ theLoai: undefined })}
          />
          <div className="ke gap-2">
            {CACH_SAP.map((c) => (
              <Link key={c.ma} href={duong({ sap: c.ma })}
                className={gop('chip', c.ma === loc.sap && 'chip-chon')}>
                {c.ten}
              </Link>
            ))}
            <Link href={duong({ vietHoa: loc.vietHoa ? undefined : true })}
              className={gop('chip', loc.vietHoa && 'chip-chon')}>
              Có bản Việt hoá
            </Link>
          </div>
        </div>

        {game.length === 0 ? (
          <div className="the p-8 text-center">
            <p className="text-[14px] font-semibold">Không có game nào khớp</p>
            <p className="phu mt-1">Thử bỏ bớt một bộ lọc, hoặc gửi yêu cầu cho SunnyStore.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/duyet" className="nut-xam">Bỏ hết bộ lọc</Link>
              <Link href="/yeu-cau" className="nut-vien">Yêu cầu game</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Máy bàn xếp hai cột: hàng game cao 72px, một cột thì màn hình
                rộng bỏ trống hẳn nửa bên phải mà vẫn phải cuộn. */}
            {/*
              `min-w-0` trên từng ô lưới, không thừa.

              Ô của lưới CSS mặc định mang `min-width: auto`, nghĩa là nó không
              chịu hẹp hơn nội dung bên trong. Một hàng game có biểu tượng 56px,
              tên game và nút cài, nên ở màn hình 320px cái ô ấy đẩy rộng cả
              cột — và cả TRANG cuộn ngang theo. Đúng lỗi này đã có thật: trang
              duyệt tràn 51px ở 320px, trong khi `/tim` dùng cùng hàng game ấy
              mà không sao, vì nó xếp dòng chứ không xếp lưới.

              320px là cỡ máy Android cũ, tức là đúng người mở một cửa hàng game Java.
            */}
            <ul className="grid gap-x-8 gap-y-3.5 xl:grid-cols-2">
              {game.map((g) => (
                <li key={g.id} className="min-w-0"><HangGame game={g} /></li>
              ))}
            </ul>
            <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
              dungDuong={(t) => `/duyet${thanhTruyVan(loc, { trang: t })}`} />
          </>
        )}
      </div>

      <CotLoc nhom={nhom} />
    </div>
  );
}
