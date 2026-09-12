import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { KhungTai, type BanXem } from '@/components/game/KhungTai';
import { NutChiaSe } from '@/components/game/NutChiaSe';
import { NutLui } from '@/components/game/NutLui';
import { TabGame } from '@/components/game/TabGame';
import { HangSoLieu, dungSoLieu } from '@/components/game/HangSoLieu';
import type { MaHeMay } from '@/lib/he-may';
import { diemSao } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

/*
 * KHUNG CHUNG CỦA MỘT GAME.
 *
 * Tên game, số liệu, khung tải và hàng tab nằm ở ĐÂY chứ không ở từng trang
 * con. Nhờ vậy bấm sang tab Diễn đàn thì phần đầu đứng yên, không nháy lại —
 * và nút tải vẫn ở nguyên chỗ cũ, kể cả khi đang đọc một chủ đề thảo luận.
 *
 * Trên máy bàn phần đầu ấy là một cột trái DÍNH LẠI, nên đọc tới bình luận
 * cuối trang vẫn còn nút tải trong tầm mắt.
 */
export default async function KhungGame({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ duongDan: string }>;
}) {
  const { duongDan } = await params;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: {
      id: true, duongDan: true, ten: true, tenViet: true, nhaPhatTrien: true,
      icon: true, vietHoa: true, tongSao: true, soLuotDanhGia: true, soLuotTai: true,
      namPhatHanh: true, ngonNgu: true,
      theLoai: { select: { theLoai: { select: { ten: true, duongDan: true } } } },
      tacGia: { select: { tenDangNhap: true, tenHienThi: true, tenTacGia: true } },
      banTai: {
        orderBy: [{ moiNhat: 'desc' }, { ngayRa: 'desc' }],
        take: 60,
        select: {
          id: true, heMay: true, soHieu: true, moiNhat: true, dungLuong: true, ngayRa: true,
          doiMoi: true, ghiChu: true, duongDanCuaHang: true,
          tep: { select: { id: true, loai: true, dungLuong: true, tenTep: true, maKiemTra: true } },
        },
      },
      _count: { select: { chuDe: true } },
    },
  });
  if (!game) notFound();

  const sao = diemSao(game.tongSao, game.soLuotDanhGia);

  /*
   * HẠNG TRONG THỂ LOẠI CHÍNH.
   *
   * Đếm xem có bao nhiêu game cùng thể loại được tải nhiều hơn, rồi cộng một —
   * rẻ hơn hẳn việc kéo cả danh sách về rồi tự tìm chỗ đứng, và không phải
   * dựng thêm bảng nào để lưu hạng.
   *
   * Chỉ xét thể loại ĐẦU TIÊN: một game ba thể loại thì có ba hạng, mà bày cả
   * ba lên một ô là biến con số thành thứ phải đọc chú thích mới hiểu.
   */
  const theLoaiChinh = game.theLoai[0]?.theLoai ?? null;
  const hang = theLoaiChinh
    ? {
        thu: 1 + await db.game.count({
          where: {
            ...DANG_HIEN,
            id: { not: game.id },
            theLoai: { some: { theLoai: { duongDan: theLoaiChinh.duongDan } } },
            soLuotTai: { gt: game.soLuotTai },
          },
        }),
        theLoai: theLoaiChinh.ten,
        duongDan: theLoaiChinh.duongDan,
      }
    : null;

  const soLieu = dungSoLieu({
    sao,
    soLuotDanhGia: game.soLuotDanhGia,
    soLuotTai: game.soLuotTai,
    dungLuong: game.banTai[0]?.dungLuong ?? null,
    soHieu: game.banTai[0]?.soHieu ?? null,
    hang,
    namPhatHanh: game.namPhatHanh,
    ngonNgu: game.ngonNgu,
    tacGia: game.tacGia
      ? {
          ten: game.tacGia.tenTacGia ?? game.tacGia.tenHienThi,
          duongDan: `/tac-gia/${game.tacGia.tenDangNhap}`,
        }
      : game.nhaPhatTrien
        ? {
            ten: game.nhaPhatTrien,
            duongDan: `/nha-phat-trien/${encodeURIComponent(game.nhaPhatTrien)}`,
          }
        : null,
  });
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
      tenTep: t.tenTep, maKiemTra: t.maKiemTra,
    })),
  }));

  return (
    /*
     * HAI BỐ CỤC KHÁC NHAU, KHÔNG PHẢI MỘT BỐ CỤC CO GIÃN.
     *
     * Điện thoại: xếp dọc theo đúng thứ tự CH Play dùng — tên game, số liệu,
     * NÚT TẢI, rồi mới tới tab và nội dung. Người mở trang này phần lớn đã
     * biết mình muốn game gì; bắt họ cuộn qua ba đoạn văn mới thấy nút là bắt
     * vô ích.
     *
     * Máy bàn: cột trái dính lại; cột phải cuộn qua ảnh, mô tả, đánh giá,
     * diễn đàn.
     */
    <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-x-10">
      <div className="space-y-5 lg:sticky lg:top-[68px]">
        {/*
          HÀNG NÚT GÓC TRÊN — lùi bên trái, chia sẻ bên phải.

          Đúng cặp nút App Store đặt đè lên ảnh bìa ở đầu trang ứng dụng. Ở đây
          chưa có ảnh bìa nên chúng nằm thành một hàng riêng trên cùng, nhưng
          vẫn giữ nguyên hai góc ấy: tay cầm điện thoại thì hai góc trên là hai
          chỗ ngón cái mò tới mà không cần nhìn.
        */}
        <div className="flex items-center justify-between">
          <NutLui />
          <NutChiaSe ten={game.ten} duongDan={game.duongDan} />
        </div>

        <header>
          <div className="flex gap-4">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={88} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[21px] font-bold leading-tight tracking-tight">{game.ten}</h1>
              {game.tenViet && <p className="phu mt-0.5">{game.tenViet}</p>}
              {/* Tên hãng bấm được, như App Store: người ta nhớ "mấy game của
                  Gameloft hồi đó" rõ hơn là nhớ tên từng game. */}
              {/*
                Có TÁC GIẢ thì trỏ về trang tác giả, không trỏ về trang gom
                theo tên hãng. Trang tên hãng gom theo một CHUỖI ghi trên từng
                game nên hai cách gõ thành hai hãng; trang tác giả gom theo tài
                khoản nên nó là thật, và là chỗ tác giả tự giới thiệu.
              */}
              {game.tacGia ? (
                <Link href={`/tac-gia/${game.tacGia.tenDangNhap}`}
                  className="mt-1 block text-[13px] font-semibold text-nhan hover:underline">
                  {game.tacGia.tenTacGia ?? game.tacGia.tenHienThi}
                </Link>
              ) : game.nhaPhatTrien && (
                <Link href={`/nha-phat-trien/${encodeURIComponent(game.nhaPhatTrien)}`}
                  className="mt-1 block text-[13px] font-semibold text-nhan hover:underline">
                  {game.nhaPhatTrien}
                </Link>
              )}
              {/* Thể loại BẤM ĐƯỢC, cùng lẽ với tên hãng: thấy một game đua xe
                  hay thì việc muốn làm ngay là xem gian đua xe có gì nữa. */}
              <p className="phu mt-1">
                {game.theLoai.length > 0
                  ? game.theLoai.map((t, i) => (
                      <span key={t.theLoai.duongDan}>
                        {i > 0 && ' · '}
                        <Link href={`/the-loai/${t.theLoai.duongDan}`} className="hover:text-chu hover:underline">
                          {t.theLoai.ten}
                        </Link>
                      </span>
                    ))
                  : 'Game'}
                {game.vietHoa && ' · Có bản Việt hoá'}
              </p>
            </div>
          </div>

          <HangSoLieu o={soLieu} />
        </header>

        <section id="tai" className="scroll-mt-20 space-y-3">
          <h2 className="tieu-de lg:sr-only">Tải về</h2>
          <KhungTai ban={banXem} />
        </section>
      </div>

      <div className="mt-8 lg:mt-0">
        <TabGame duongDanGame={game.duongDan} soChuDe={game._count.chuDe} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

