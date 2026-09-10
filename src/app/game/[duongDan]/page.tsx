import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronRight, MessageSquare, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/kho-game';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { KhungTai, type BanXem } from '@/components/game/KhungTai';
import { SaoNam } from '@/components/game/SaoNam';
import { PhoDiem } from '@/components/game/PhoDiem';
import { KeThe } from '@/components/game/KeThe';
import { NGON_NGU, type MaHeMay } from '@/lib/he-may';
import { catChu, cachDay, diemSao, gonDungLuong, gonSo } from '@/lib/tien-ich';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { ODanhGia } from '@/components/game/ODanhGia';
import { KhoiGap } from '@/components/KhoiGap';

export const dynamic = 'force-dynamic';

async function layGame(duongDan: string) {
  return db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: {
      id: true, duongDan: true, ten: true, tenViet: true, nhaPhatTrien: true,
      namPhatHanh: true, gioiThieu: true, cachChoi: true, luuY: true,
      icon: true, ngonNgu: true, vietHoa: true,
      tongSao: true, soLuotDanhGia: true, soLuotTai: true, soLuotXem: true,
      dangLuc: true,
      theLoai: { select: { theLoai: { select: { ten: true, duongDan: true } } } },
      anhChup: { orderBy: { thuTu: 'asc' }, take: 12, select: { id: true, duongDan: true, chuThich: true } },
      banTai: {
        orderBy: [{ moiNhat: 'desc' }, { ngayRa: 'desc' }],
        take: 60,
        select: {
          id: true, heMay: true, soHieu: true, moiNhat: true, dungLuong: true, ngayRa: true,
          doiMoi: true, ghiChu: true, duongDanCuaHang: true,
          tep: { select: { id: true, loai: true, dungLuong: true, maKiemTra: true, thuatToan: true } },
        },
      },
      _count: { select: { chuDe: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { ten: true, gioiThieu: true },
  });
  if (!g) return { title: 'Không tìm thấy game' };
  return {
    title: g.ten,
    description: g.gioiThieu ? catChu(g.gioiThieu, 160) : undefined,
  };
}

export default async function TrangGame({ params }: { params: Promise<{ duongDan: string }> }) {
  const { duongDan } = await params;
  const game = await layGame(duongDan);
  if (!game) notFound();

  const nguoi = await nguoiHienTai();

  const [phanBo, danhGia, danhGiaCuaToi, chuDe, lienQuan] = await Promise.all([
    db.danhGia.groupBy({ by: ['sao'], where: { gameId: game.id }, _count: { _all: true } }),
    db.danhGia.findMany({
      where: { gameId: game.id, noiDung: { not: null } },
      orderBy: { taoLuc: 'desc' },
      take: 6,
      select: {
        id: true, sao: true, noiDung: true, taoLuc: true,
        nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
      },
    }),
    nguoi
      ? db.danhGia.findUnique({
          where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
          select: { sao: true, noiDung: true },
        })
      : null,
    db.chuDe.findMany({
      where: { gameId: game.id },
      orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }],
      take: 3,
      select: {
        id: true, tieuDe: true, soTraLoi: true, traLoiCuoiLuc: true,
        nguoi: { select: { tenHienThi: true } },
      },
    }),
    layKe(
      {
        id: { not: game.id },
        theLoai: { some: { theLoai: { duongDan: { in: game.theLoai.map((t) => t.theLoai.duongDan) } } } },
      },
      [{ soLuotTai: 'desc' }, { id: 'desc' }],
      12,
    ),
  ]);

  // Đếm lượt xem sau khi đã lấy đủ dữ liệu, và không chờ kết quả: hỏng bộ đếm
  // thì cùng lắm lệch một con số, còn chặn cả trang lại thì hỏng cả trang.
  void db.game.update({
    where: { id: game.id }, data: { soLuotXem: { increment: 1 } }, select: { id: true },
  }).catch(() => {});

  const sao = diemSao(game.tongSao, game.soLuotDanhGia);
  const he = [...new Set(game.banTai.map((b) => b.heMay))] as MaHeMay[];
  const banMoiNhat = game.banTai[0];

  const banXem: BanXem[] = game.banTai.map((b) => ({
    id: b.id,
    heMay: b.heMay as MaHeMay,
    soHieu: b.soHieu,
    moiNhat: b.moiNhat,
    dungLuong: b.dungLuong != null ? Number(b.dungLuong) : null,
    ngayRa: b.ngayRa ? b.ngayRa.toISOString().slice(0, 10) : null,
    doiMoi: b.doiMoi,
    ghiChu: b.ghiChu,
    duongDanCuaHang: b.duongDanCuaHang,
    tep: b.tep.map((t) => ({
      id: t.id, loai: t.loai,
      dungLuong: t.dungLuong != null ? Number(t.dungLuong) : null,
      maKiemTra: t.maKiemTra, thuatToan: t.thuatToan,
    })),
  }));

  return (
    /*
     * HAI BỐ CỤC KHÁC NHAU, KHÔNG PHẢI MỘT BỐ CỤC CO GIÃN.
     *
     * Điện thoại: xếp dọc theo đúng thứ tự CH Play dùng — tên game, số liệu,
     * NÚT TẢI, rồi mới tới ảnh và mô tả. Người mở trang này phần lớn đã biết
     * mình muốn game gì; bắt họ cuộn qua ba đoạn văn mới thấy nút là bắt vô ích.
     *
     * Máy bàn: cột trái DÍNH LẠI, mang tên game, số liệu và cả khung tải; cột
     * phải cuộn qua ảnh, mô tả, đánh giá, thảo luận. Đọc tới bình luận cuối
     * trang mà nút tải vẫn trong tầm mắt — thứ mà bố cục dọc kéo giãn ra không
     * làm được, và cũng là lý do máy bàn đáng có bố cục riêng.
     */
    <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-x-10">
      <div className="space-y-5 lg:sticky lg:top-[68px]">
        <header>
          <div className="flex gap-4">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={88} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[21px] font-bold leading-tight tracking-tight">{game.ten}</h1>
              {game.tenViet && <p className="phu mt-0.5">{game.tenViet}</p>}
              {game.nhaPhatTrien && (
                <p className="mt-1 text-[13px] font-semibold text-nhan">{game.nhaPhatTrien}</p>
              )}
              <p className="phu mt-1">
                {game.theLoai.map((t) => t.theLoai.ten).join(' · ') || 'Game'}
                {game.vietHoa && ' · Có bản Việt hoá'}
              </p>
            </div>
          </div>

          {/*
            HÀNG BỐN Ô SỐ LIỆU, ngăn bằng vạch dọc.
            Chi tiết CH Play dùng ở mọi trang ứng dụng, và nó làm được một việc
            mà đoạn văn không làm được: trả lời bốn câu hỏi khác nhau trong một
            cái liếc mắt. Cuộn ngang ở khổ hẹp thay vì xuống dòng, để nó vẫn là
            MỘT hàng chứ không vỡ thành hai.
          */}
          {/*
            HÀNG SỐ LIỆU — SỐ TO TRÊN, NHÃN NHỎ DƯỚI. Đúng hai dòng.

            Bản trước có ba dòng: một nhãn IN HOA ở trên, con số ở giữa, một
            dòng chú ở dưới. CH Play chỉ có hai — "4,3★" rồi "12 N đánh giá" —
            và cái nhãn in hoa kia là thừa thật: đọc "5,3K / lượt tải" là hiểu
            ngay, thêm chữ "LƯỢT TẢI" phía trên chỉ tổ chiếm một dòng nữa và
            bắt mắt nhảy ba bậc thay vì hai.

            BA ô, không phải bốn — đúng số CH Play dùng, và vừa khít bề ngang
            điện thoại nên không phải cuộn. Ô "Hệ máy" đã bỏ: dãy chip chọn hệ
            nằm ngay bốn chục điểm ảnh bên dưới đã nói đúng điều ấy, lại còn
            nói rõ hơn vì liệt kê ra hết chứ không gộp thành "+4 hệ nữa".

            Máy bàn: cột bên chỉ rộng 300px nên xếp thành lưới 2 cột, bỏ vạch.
          */}
          <dl className="ke mt-4 divide-x divide-vien text-center lg:mt-5
            lg:grid lg:grid-cols-2 lg:gap-y-4 lg:divide-x-0 lg:overflow-visible lg:text-left">
            <O chinh={game.soLuotDanhGia > 0 ? sao.toFixed(1).replace('.', ',') : '—'}
              icon={game.soLuotDanhGia > 0 ? <SaoNam diem={sao} co={12} /> : null}
              nhan={game.soLuotDanhGia > 0 ? `${gonSo(game.soLuotDanhGia)} đánh giá` : 'chưa có đánh giá'} />
            <O chinh={gonSo(game.soLuotTai)} nhan="lượt tải" />
            <O chinh={gonDungLuong(banMoiNhat?.dungLuong ?? null)}
              nhan={`bản ${banMoiNhat?.soHieu ?? '—'}`} />
          </dl>
        </header>

        <section id="tai" className="scroll-mt-20">
          <h2 className="tieu-de mb-3 lg:sr-only">Tải về</h2>
          <KhungTai ban={banXem} />
        </section>
      </div>

      <div className="mt-8 space-y-8 lg:mt-0">
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

          Cả hai cửa hàng lớn chỉ có đúng một mục mô tả ("About this game" /
          phần mô tả), không tách "cách chơi" ra thành mục riêng. Tách ra thì
          được thêm một cái tiêu đề mà chẳng nói thêm điều gì — cách chơi vốn
          là một phần của việc giới thiệu game.
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

        {/* Lưu ý tương thích gấp lại, đặt ngay sau phần giới thiệu — đúng chỗ
            CH Play để mục "an toàn dữ liệu". Khung vàng cỡ lớn như bản trước
            hét to hơn cả nút tải, trong khi phần lớn người đọc lướt qua nó. */}
        {game.luuY && (
          <KhoiGap tieuDe="Cần biết trước khi tải"
            tomTat="Máy nào chạy được, và những lỗi đã biết"
            icon={<TriangleAlert size={16} className="text-canh" />}>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-mo">{game.luuY}</p>
          </KhoiGap>
        )}

        {/*
          BẢNG THÔNG TIN CHỈ GIỮ THỨ CHƯA NÓI Ở ĐÂU KHÁC.
          Bản trước bảng này in lại "Nhà phát triển" (đã có ngay dưới tên game,
          in màu nhấn) và "Hệ máy" (đã có ở hàng số liệu VÀ ở dãy chip trong
          khung tải — tức là in tới ba lần trên một màn hình). Một bảng chỉ để
          nhắc lại thì người đọc học được cách bỏ qua nó, rồi bỏ qua luôn mấy
          dòng thật sự chỉ có ở đây.
        */}
        <section>
          <h2 className="tieu-de mb-3">Thông tin</h2>
          <dl className="the divide-y divide-vien text-[13px]">
            <Dong nhan="Năm phát hành" giaTri={game.namPhatHanh ? String(game.namPhatHanh) : '—'} />
            <Dong nhan="Ngôn ngữ" giaTri={NGON_NGU[game.ngonNgu] ?? game.ngonNgu} />
            <Dong nhan="Số bản tải" giaTri={`${game.banTai.length} bản trên ${he.length} hệ máy`} />
            <Dong nhan="Lên kho" giaTri={game.dangLuc ? cachDay(game.dangLuc) : '—'} />
          </dl>
        </section>

        {/* ══ ĐÁNH GIÁ ══════════════════════════════════════════════════
            Điểm to bên trái, phổ điểm bên phải — bố cục của CH Play. Chỉ in
            con số trung bình thôi thì không nói được "4,3 này là do ai cũng
            cho 4, hay do một nửa cho 5 và một nửa cho 2". */}
        <section>
          <h2 className="tieu-de mb-3">Đánh giá</h2>
          <PhoDiem sao={sao} tong={game.soLuotDanhGia}
            phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))} />

          <div className="mt-5">
            <ODanhGia gameId={game.id} banDau={danhGiaCuaToi} daDangNhap={!!nguoi} />
          </div>

          {danhGia.length > 0 && (
            <ul className="mt-5 space-y-4">
              {danhGia.map((d) => (
                <li key={d.id} className="vach pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-nen3 text-[12px] font-bold">
                      {d.nguoi.tenHienThi.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{d.nguoi.tenHienThi}</p>
                      <p className="flex items-center gap-1.5">
                        <SaoNam diem={d.sao} co={11} />
                        <span className="phu">{cachDay(d.taoLuc)}</span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed">{d.noiDung}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ══ CỘNG ĐỒNG ═════════════════════════════════════════════════
            Thảo luận nằm TRONG game chứ không có bảng chuyên mục riêng: người
            ta bàn về game, không bàn về "chuyên mục game hành động". */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="tieu-de">Cộng đồng</h2>
              <p className="phu mt-0.5">{game._count.chuDe} chủ đề về game này</p>
            </div>
            <Link href={`/game/${game.duongDan}/cong-dong`}
              className="flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-nhan hover:underline">
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>

          {chuDe.length === 0 ? (
            <div className="the p-5 text-center">
              <MessageSquare size={22} className="mx-auto text-mo" aria-hidden />
              <p className="mt-2 text-[13px] font-semibold">Chưa ai mở lời</p>
              <p className="phu mt-0.5">Hỏi cách qua màn, khoe điểm, hay chỉ để nói chuyện.</p>
              <Link href={`/game/${game.duongDan}/cong-dong/dang`} className="nut-xam mt-3">
                Đăng chủ đề đầu tiên
              </Link>
            </div>
          ) : (
            <ul className="the divide-y divide-vien">
              {chuDe.map((c) => (
                <li key={c.id}>
                  <Link href={`/game/${game.duongDan}/cong-dong/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{c.tieuDe}</span>
                      <span className="phu block truncate">
                        {c.nguoi.tenHienThi} · {cachDay(c.traLoiCuoiLuc)}
                      </span>
                    </span>
                    <span className="phu flex shrink-0 items-center gap-1">
                      <MessageSquare size={12} aria-hidden /> {c.soTraLoi}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <KeThe ten="Game tương tự" phu="Cùng thể loại, xếp theo lượt tải" game={lienQuan} />
      </div>
    </div>
  );
}

/**
 * Một ô số liệu: con số to, nhãn nhỏ ngay dưới. Không có gì khác.
 *
 * `icon` chỉ dùng cho ô điểm sao — năm ngôi sao đứng cạnh con số nói được
 * "trên thang 5" mà không phải viết ra chữ ấy.
 */
function O({ chinh, nhan, icon }: { chinh: string; nhan: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-[92px] flex-1 whitespace-nowrap px-3 lg:min-w-0 lg:px-0">
      <dd className="flex items-center justify-center gap-1 text-[17px] font-bold leading-none lg:justify-start">
        {chinh}{icon}
      </dd>
      <dt className="phu mt-1">{nhan}</dt>
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
