import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/danh-muc';
import { PhoDiem } from '@/components/game/PhoDiem';
import { SaoNam } from '@/components/game/SaoNam';
import { KeThe } from '@/components/game/KeThe';
import { ODanhGia } from '@/components/game/ODanhGia';
import { BaiDanhGia, CHON_DANH_GIA } from '@/components/game/BaiDanhGia';
import { KeAnhChup } from '@/components/game/KeAnhChup';
import { TamDanhGia } from '@/components/game/TamDanhGia';
import { KhoiGap } from '@/components/KhoiGap';
import { NGON_NGU } from '@/lib/he-may';
import { cachDay, catChu, gonSo } from '@/lib/tien-ich';
import { bocChu, dungChuDam } from '@/lib/chu-dam';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { ten: true, gioiThieu: true },
  });
  if (!g) return { title: 'Không tìm thấy game' };
  return { title: g.ten, description: g.gioiThieu ? catChu(bocChu(g.gioiThieu), 160) : undefined };
}

/*
 * TAB "THÔNG TIN" của một game.
 *
 * Tên game, số liệu và khung tải nằm ở khung chung (`layout.tsx`), nên ở đây
 * chỉ còn phần nội dung: ảnh, giới thiệu, bảng thông tin, đánh giá, game
 * tương tự. Tab "Diễn đàn" là một trang khác, cùng khung.
 */
export default async function TabThongTin({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ sao?: string }>;
}) {
  const { duongDan } = await params;
  const { sao: saoNhap } = await searchParams;

  // Lọc chỉ nhận 1..5; số rác trên URL thì coi như không lọc, chứ không phải
  // lỗi — địa chỉ là thứ ai cũng sửa tay được.
  const soLoc = Number(saoNhap);
  const locSao = Number.isInteger(soLoc) && soLoc >= 1 && soLoc <= 5 ? soLoc : null;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: {
      id: true, gioiThieu: true, namPhatHanh: true,
      ngonNgu: true, dangLuc: true,
      anhChup: { orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], take: 12, select: { id: true, duongDan: true, chuThich: true } },
      theLoai: { select: { theLoai: { select: { duongDan: true } } } },
      _count: { select: { banTai: true } },
    },
  });
  if (!game) notFound();

  const nguoi = await nguoiHienTai();

  const [phanBo, danhGia, cuaToi, lienQuan, soHe] = await Promise.all([
    db.danhGia.groupBy({ by: ['sao'], where: { gameId: game.id }, _count: { _all: true } }),
    db.danhGia.findMany({
      where: { gameId: game.id, noiDung: { not: null }, ...(locSao ? { sao: locSao } : {}) },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      // Năm bài là bản nếm thử; đọc hết thì mở tấm trượt, không rời trang.
      take: 5,
      select: CHON_DANH_GIA,
    }),
    nguoi
      ? db.danhGia.findUnique({
          where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
          select: { sao: true, noiDung: true },
        })
      : null,
    layKe(
      {
        id: { not: game.id },
        theLoai: { some: { theLoai: { duongDan: { in: game.theLoai.map((t) => t.theLoai.duongDan) } } } },
      },
      [{ soLuotTai: 'desc' }, { id: 'desc' }],
      12,
    ),
    db.banTai.findMany({ where: { gameId: game.id }, distinct: ['heMay'], select: { heMay: true } }),
  ]);

  // Đếm lượt xem sau khi đã lấy đủ dữ liệu, và không chờ kết quả: hỏng bộ đếm
  // thì cùng lắm lệch một con số, còn chặn cả trang lại thì hỏng cả trang.
  void db.game.update({
    where: { id: game.id }, data: { soLuotXem: { increment: 1 } }, select: { id: true },
  }).catch(() => {});

  // Ô trả lời chỉ VẼ ra cho quản trị; còn chặn thật nằm trong `traLoiDanhGia`,
  // vì một hàm `'use server'` thì ai cũng gọi được, không cần thấy nút.
  const laQuanTri = nguoi?.vaiTro === 'QUAN_TRI';

  const gom = phanBo.reduce((t, p) => t + p._count._all, 0);
  const tongSao = phanBo.reduce((t, p) => t + p.sao * p._count._all, 0);
  const sao = gom > 0 ? Math.round((tongSao / gom) * 10) / 10 : 0;

  return (
    <div className="space-y-8">
      {game.anhChup.length > 0 && (
        <KeAnhChup anh={game.anhChup} />
      )}

      {/*
        MỘT KHỐI MÔ TẢ DUY NHẤT.

        Từng có ba ô rời: Giới thiệu, Cách chơi, Cần biết trước khi tải. Ba ô
        ấy sinh ra từ hồi mô tả còn là chữ trần, không xuống dòng nổi một đầu
        đề — nên phải lấy chính biểu mẫu làm cấu trúc. Nay ô mô tả có đầu đề,
        danh sách và trích dẫn, nên người viết tự chia phần đúng theo game họ
        đang viết, thay vì nhét vào ba ngăn do người khác đặt sẵn.

        Cả App Store lẫn CH Play cũng chỉ có đúng một mục mô tả.
      */}
      {game.gioiThieu && (
        <section>
          <h2 className="tieu-de mb-2">Giới thiệu</h2>
          {/*
            `dangerouslySetInnerHTML` ở đây KHÔNG nguy hiểm, và chỗ nguy hiểm
            thật đã bị chặn từ trước: `dungChuDam` bật `html: false`, nên mọi
            thẻ gõ tay trong phần mô tả đều bị escape thành chữ thường. Đầu ra
            chỉ chứa đúng những thẻ do chính bộ dựng sinh — xem `chu-dam.ts`.
          */}
          <div className="chu-dam" dangerouslySetInnerHTML={{ __html: dungChuDam(game.gioiThieu) }} />
        </section>
      )}

      {/*
        Bảng thông tin chỉ giữ thứ CHƯA nói ở đâu khác trên trang.
        Nhà phát triển đã in màu nhấn dưới tên game; hệ máy đã có ở dãy chip;
        còn năm phát hành và ngôn ngữ nay nằm trên hàng số liệu ngay dưới tên
        game — in lại ở đây thì bảng này chỉ là một bản sao mờ của hàng ấy.
      */}
      <section>
        <h2 className="tieu-de mb-3">Thông tin</h2>
        <dl className="the divide-y divide-vien text-[13px]">
          <Dong nhan="Số bản tải" giaTri={`${game._count.banTai} bản trên ${soHe.length} hệ máy`} />
          <Dong nhan="Có mặt từ" giaTri={game.dangLuc ? cachDay(game.dangLuc) : '—'} />
        </dl>
      </section>

      {/* Điểm to bên trái, phổ điểm bên phải — bố cục của CH Play. Chỉ in con
          số trung bình thì không nói được "4,3 này là do ai cũng cho 4, hay do
          một nửa cho 5 và một nửa cho 2". */}
      <section>
        <h2 className="tieu-de mb-3">Đánh giá</h2>
        <PhoDiem sao={sao} tong={gom} locSao={locSao}
          phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))} />

        {locSao !== null && (
          <p className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="text-mo">Đang xem đánh giá {locSao} sao</span>
            <Link href="?" scroll={false} className="font-semibold text-nhan hover:underline">
              Xem tất cả
            </Link>
          </p>
        )}

        <div className="mt-5">
          <ODanhGia gameId={game.id} banDau={cuaToi} daDangNhap={!!nguoi} />
        </div>

        {danhGia.length === 0 && locSao !== null && (
          <p className="phu mt-5">Không có bài nào {locSao} sao kèm lời nhận xét.</p>
        )}

        {danhGia.length > 0 && (
          <ul className="mt-5 space-y-4">
            {danhGia.map((d) => (
              <li key={d.id} className="vach pt-4 first:border-0 first:pt-0">
                <BaiDanhGia d={d} nguoiXemId={nguoi?.id ?? null} laQuanTri={laQuanTri} />
              </li>
            ))}
          </ul>
        )}

        {/* Còn bài chưa bày thì mời đọc tiếp — trong một tấm trượt, không sang
            trang khác: người đang cân nhắc tải hay đọc vài bài rồi ngước lên
            nhìn lại nút tải và cỡ tệp. */}
        {gom > danhGia.length && (
          <TamDanhGia gameId={game.id} duongDan={duongDan} tong={gom} sao={sao}
            phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))}
            banDau={danhGia} />
        )}
      </section>

      <KeThe ten="Game tương tự" phu="Cùng thể loại, xếp theo lượt tải" game={lienQuan} />
    </div>
  );
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-mo">{nhan}</dt>
      <dd className="text-right font-medium">{giaTri}</dd>
    </div>
  );
}
