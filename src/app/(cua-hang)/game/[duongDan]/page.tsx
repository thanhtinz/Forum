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
import { KhoiGap } from '@/components/KhoiGap';
import { NGON_NGU } from '@/lib/he-may';
import { cachDay, catChu, gonSo } from '@/lib/tien-ich';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { ten: true, gioiThieu: true },
  });
  if (!g) return { title: 'Không tìm thấy game' };
  return { title: g.ten, description: g.gioiThieu ? catChu(g.gioiThieu, 160) : undefined };
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
      id: true, gioiThieu: true, cachChoi: true, luuY: true, namPhatHanh: true,
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
      take: 6,
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
        <section className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
          {game.anhChup.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.id} src={a.duongDan} alt={a.chuThich ?? ''} loading="lazy"
              className="h-52 w-auto rounded-the border border-vien object-cover sm:h-72" />
          ))}
        </section>
      )}

      {/*
        MỘT KHỐI "GIỚI THIỆU" DUY NHẤT.
        Cả hai cửa hàng lớn chỉ có đúng một mục mô tả, không tách "cách chơi"
        ra thành mục riêng — cách chơi vốn là một phần của việc giới thiệu game.
      */}
      {(game.gioiThieu || game.cachChoi) && (
        <section>
          <h2 className="tieu-de mb-2">Giới thiệu</h2>
          {game.gioiThieu && (
            <p className="whitespace-pre-line text-[14px] leading-relaxed">{game.gioiThieu}</p>
          )}
          {game.cachChoi && (
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed">{game.cachChoi}</p>
          )}
        </section>
      )}

      {/* Lưu ý tương thích gấp lại — khung vàng cỡ lớn hét to hơn cả nút tải,
          trong khi phần lớn người đọc lướt qua nó. */}
      {game.luuY && (
        <KhoiGap tieuDe="Cần biết trước khi tải"
          tomTat="Máy nào chạy được, và những lỗi đã biết"
          icon={<TriangleAlert size={16} className="text-canh" />}>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-mo">{game.luuY}</p>
        </KhoiGap>
      )}

      {/* Bảng thông tin chỉ giữ thứ CHƯA nói ở đâu khác trên trang: nhà phát
          triển đã in màu nhấn dưới tên game, hệ máy đã có ở dãy chip. */}
      <section>
        <h2 className="tieu-de mb-3">Thông tin</h2>
        <dl className="the divide-y divide-vien text-[13px]">
          <Dong nhan="Năm phát hành" giaTri={game.namPhatHanh ? String(game.namPhatHanh) : '—'} />
          <Dong nhan="Ngôn ngữ" giaTri={NGON_NGU[game.ngonNgu] ?? game.ngonNgu} />
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

        {/* Sáu bài là bản nếm thử. Ai đang cân nhắc tải thật thì muốn đọc hết,
            và tab Đánh giá cho lọc theo sao lẫn sắp theo điểm. */}
        {gom > danhGia.length && (
          <Link href={`/game/${duongDan}/danh-gia${locSao ? `?sao=${locSao}` : ''}`}
            className="nut-vien mt-5 w-full">
            Xem tất cả {gonSo(gom)} đánh giá
          </Link>
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
