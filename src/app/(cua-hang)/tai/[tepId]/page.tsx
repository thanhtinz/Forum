import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ExternalLink, FileDigit, Info, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { layKe } from '@/lib/danh-muc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { KeThe } from '@/components/game/KeThe';
import { KhoiGap } from '@/components/KhoiGap';
import { NGUONG_DONG, TienTrinhTai } from '@/components/game/TienTrinhTai';
import { MO_TA_HE, NHAC_KHI_CAI, type MaHeMay } from '@/lib/he-may';
import { cuaKhoNha } from '@/lib/kho';
import { tenTepTaiVe } from '@/lib/ten-tep';
import { gonDungLuong } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Đang tải',
  // Trang này chỉ sống mấy chục giây và không có gì để ai tìm thấy qua máy tìm.
  robots: { index: false, follow: false },
};

/*
 * TRANG TẢI — chỗ người ta đứng chờ.
 *
 * Trước đây bấm nút tải là trình duyệt lẳng lặng bắt đầu một lượt tải ở góc
 * dưới cửa sổ, còn trang game thì đứng nguyên. Trên máy bàn thì tạm ổn; trên
 * điện thoại, cái thông báo ấy trôi qua trong một giây và người bấm không chắc
 * mình vừa bấm trúng chưa — nên bấm thêm lần nữa.
 *
 * Nay có một trang riêng, và nó làm ba việc mà cái thanh của trình duyệt không
 * làm được: nói rõ đang tải GAME NÀO, BẢN NÀO; bày mã sha256 ngay cạnh lúc
 * người ta còn đang chờ, đúng lúc mã ấy có ích; và nhắc cách cài trước khi tệp
 * về tới nơi.
 */
export default async function TrangTai({ params }: { params: Promise<{ tepId: string }> }) {
  const { tepId } = await params;

  const tep = await db.tepTai.findFirst({
    where: { id: tepId, ban: { game: { trangThai: 'DANG_HIEN' } } },
    select: {
      id: true, loai: true, duongDan: true, tenTep: true, dungLuong: true, maKiemTra: true,
      ban: {
        select: {
          heMay: true, soHieu: true, ghiChu: true, duongDanCuaHang: true,
          game: {
            select: {
              id: true, ten: true, tenViet: true, duongDan: true, icon: true,
              theLoai: { select: { theLoai: { select: { duongDan: true } } } },
            },
          },
        },
      },
    },
  });
  if (!tep) notFound();

  const game = tep.ban.game;
  const he = tep.ban.heMay as MaHeMay;
  const nang = tep.dungLuong != null ? Number(tep.dungLuong) : null;

  /*
   * CHẢY QUA MÁY CHỦ hay GIAO CHO TRÌNH DUYỆT — quyết ở đây, không ở trình duyệt.
   *
   * Thanh tiến trình chỉ vẽ được khi mã trên trang tự đọc từng khúc, mà đọc
   * từng khúc thì phải giữ cả tệp trong bộ nhớ tới lúc xong. Nên hai chỗ phải
   * giao lại cho bộ tải sẵn có của trình duyệt: tệp quá nặng, và tệp không nằm
   * trong kho của cửa hàng (chảy tệp của máy chủ người khác qua máy mình là
   * trả tiền băng thông hộ họ).
   */
  const trongKho = cuaKhoNha(tep.duongDan) || tep.duongDan.startsWith('/');
  const veThang = !trongKho || (nang != null && nang > NGUONG_DONG);

  const lienQuan = await layKe(
    {
      id: { not: game.id },
      theLoai: { some: { theLoai: { duongDan: { in: game.theLoai.map((t) => t.theLoai.duongDan) } } } },
    },
    [{ soLuotTai: 'desc' }, { id: 'desc' }],
    12,
  );

  return (
    <div className="mx-auto max-w-[560px] space-y-6">
      <header className="flex gap-4">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={72} />
        <div className="min-w-0 flex-1">
          <p className="phu">Đang tải về</p>
          <h1 className="text-[19px] font-bold leading-tight tracking-tight">
            <Link href={`/game/${game.duongDan}`} className="hover:underline">{game.ten}</Link>
          </h1>
          <p className="phu mt-1">
            {MO_TA_HE[he]?.ten ?? he} · bản {tep.ban.soHieu} · tệp {tep.loai}
            {nang != null && ` · ${gonDungLuong(nang)}`}
          </p>
        </div>
      </header>

      {veThang ? (
        <div className="the space-y-3 p-4">
          <p className="text-[15px] font-bold">Sẵn sàng tải</p>
          <p className="phu">
            {trongKho
              ? 'Tệp này nặng, nên giao cho trình duyệt tải — nó biết nối lại chỗ đứt nếu mạng chập chờn.'
              : 'Tệp này nằm ở máy chủ của nhà phát hành, bấm để sang lấy bản gốc.'}
          </p>
          <a href={`/api/tai/${tep.id}`} className="nut-cai-dam w-full">
            <Download size={17} aria-hidden /> Tải {tep.loai}
            {nang != null && ` · ${gonDungLuong(nang)}`}
          </a>
        </div>
      ) : (
        <TienTrinhTai tepId={tep.id} duongDanGame={game.duongDan}
          dungLuong={nang}
          ten={tenTepTaiVe(tep.tenTep, game.duongDan, tep.ban.soHieu, tep.loai)} />
      )}

      {tep.ban.duongDanCuaHang && (
        <a href={tep.ban.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
          className="nut-vien !w-full">
          <ExternalLink size={15} aria-hidden /> Mở trong cửa hàng chính chủ
        </a>
      )}

      {/*
        MÃ KIỂM TRA BÀY SẴN, KHÔNG GẤP LẠI.
        Ở trang game nó nằm trong khối gấp vì người đang chọn game chưa cần tới.
        Ở đây thì khác: đây đúng là phút người ta cầm tệp trong tay, và đối
        chiếu mã là việc phải làm NGAY lúc ấy chứ không phải tuần sau.
      */}
      {tep.maKiemTra && (
        <section className="the space-y-1 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <ShieldCheck size={15} aria-hidden /> Mã kiểm tra sha256
          </p>
          <p className="break-all font-mono text-[12px] text-mo">{tep.maKiemTra}</p>
          <p className="phu">
            Tải xong, đối chiếu mã của tệp với dãy này. Khớp là tệp về nguyên
            vẹn; lệch là đường truyền làm rơi mất mấy khúc, tải lại là xong.
          </p>
        </section>
      )}

      {tep.ban.ghiChu && (
        <p className="the flex gap-2 p-4 text-[13px] text-mo">
          <FileDigit size={15} className="mt-0.5 shrink-0" aria-hidden />
          {tep.ban.ghiChu}
        </p>
      )}

      {NHAC_KHI_CAI[he] && (
        <KhoiGap tieuDe={`Cách cài trên ${MO_TA_HE[he]?.ten ?? he}`} icon={<Info size={16} />}>
          <p className="text-[13px] leading-relaxed text-mo">{NHAC_KHI_CAI[he]}</p>
        </KhoiGap>
      )}

      {/* Kệ game ở cuối: người đang chờ một thanh chạy thì có vài chục giây
          rảnh, và đó đúng là lúc cửa hàng mời xem thêm hàng. */}
      {lienQuan.length > 0 && (
        <KeThe ten="Trong lúc chờ" phu="Cùng thể loại, xếp theo lượt tải" game={lienQuan} />
      )}
    </div>
  );
}
