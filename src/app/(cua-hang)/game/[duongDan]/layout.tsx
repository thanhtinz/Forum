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
import { NutTaiDau } from '@/components/game/NutTaiDau';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { diemSao } from '@/lib/tien-ich';
import { nguoiHienTai } from '@/lib/xac-thuc';

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
      icon: true, bia: true, vietHoa: true, tongSao: true, soLuotDanhGia: true, soLuotTai: true,
      namPhatHanh: true, ngonNgu: true, doTuoi: true,
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
   * Tên hãng bày trên tấm xác nhận: ưu tiên tên tác giả đã đăng ký, rồi mới
   * tới chuỗi `nhaPhatTrien` gõ tay. Cùng một lẽ với liên kết dưới tên game —
   * tài khoản là thật, còn một chuỗi gõ tay thì hai cách gõ thành hai hãng.
   */
  const tenHang = game.tacGia?.tenTacGia ?? game.tacGia?.tenHienThi ?? game.nhaPhatTrien;

  // Ai đang xem — chỉ để in lên tấm xác nhận, y như App Store in Apple ID.
  const nguoi = await nguoiHienTai();

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
    doTuoi: game.doTuoi,
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

  /*
   * NÚT TẢI Ở NGAY ĐẦU TRANG, cạnh tên game — đúng chỗ nút "Get" của App Store.
   *
   * Khung tải đầy đủ (chọn hệ, chọn bản, lịch sử phiên bản) vẫn nằm bên dưới và
   * vẫn là chỗ để CHỌN. Nút này không thay nó, nó chỉ trả lời cái câu mà chín
   * phần mười người mở trang này đang hỏi — "tải ở đâu" — mà không bắt cuộn.
   *
   * Game chỉ có MỘT hệ máy thì nút đi thẳng tới trang tải của tệp chính: không
   * có gì để chọn thì một nhịp bấm nữa chỉ là một nhịp thừa. Nhiều hệ thì nút
   * đưa xuống khung tải, vì lúc ấy chọn máy nào là việc người dùng phải làm và
   * chọn hộ họ là chọn sai.
   */
  const tepChinh = he.length === 1 && banMoiNhat
    ? [...banMoiNhat.tep].sort((a, b) =>
        MO_TA_HE[he[0]].loaiTep.indexOf(a.loai as never)
        - MO_TA_HE[he[0]].loaiTep.indexOf(b.loai as never))[0]
    : null;

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

          Đúng cặp nút App Store đặt đè lên ảnh bìa ở đầu trang ứng dụng, và
          hai góc ấy giữ nguyên dù game có bìa hay không: tay cầm điện thoại
          thì hai góc trên là hai chỗ ngón cái mò tới mà không cần nhìn.

          CÓ BÌA thì hai nút nằm ĐÈ LÊN ảnh, kèm một vệt tối hắt từ mép trên
          xuống. Không có vệt ấy thì gặp tấm bìa sáng màu là hai nút trắng biến
          mất trên nền trắng — mà nút lùi biến mất là người ta kẹt lại trang.
        */}
        {game.bia ? (
          <div className="relative -mx-4 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.bia} alt="" fetchPriority="high"
              className="aspect-[16/9] w-full object-cover sm:rounded-the" />
            <span aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent sm:rounded-t-the" />
            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
              <NutLui />
              <NutChiaSe ten={game.ten} duongDan={game.duongDan} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <NutLui />
            <NutChiaSe ten={game.ten} duongDan={game.duongDan} />
          </div>
        )}

        <header>
          <div className="flex gap-4">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={104} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[23px] font-bold leading-[1.15] tracking-tight">{game.ten}</h1>
              {game.tenViet && <p className="phu mt-0.5">{game.tenViet}</p>}
              {/*
                KHÔNG in tên hãng ở đây nữa.

                App Store cũng không: dưới tên ứng dụng chỉ có mỗi dòng thể
                loại, còn tên hãng nằm thành MỘT HÀNG RIÊNG bấm được ở giữa
                trang. Trước đây ta in cả hai chỗ, nên tên hãng hiện hai lần
                cách nhau một gang tay — lần trên là chữ nhỏ màu xanh không rõ
                bấm được hay không, lần dưới mới là lối đi thật có mũi tên.
              */}
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

              {/*
                NÚT TẢI NẰM TRONG CỘT PHẢI, ngay dưới dòng thể loại — đúng chỗ
                nút "Get" của App Store.

                Bản trước đặt nó thành một hàng riêng bên dưới cả khối biểu
                tượng, nên nó tụt xuống mép trái, thẳng hàng với cái biểu tượng
                chứ không thẳng hàng với tên game. Nhìn ra thì rõ ngay: mắt đọc
                tên game xong đi xuống là gặp khoảng trắng, còn cái nút thì nằm
                lệch hẳn sang một cột khác.

                Cỡ tệp KHÔNG in cạnh nút nữa: hàng số liệu cuộn ngang ngay bên
                dưới đã có ô "Dung lượng" kèm số hiệu bản. In hai lần cách nhau
                ba phân thì người đọc dừng lại đối chiếu xem hai chỗ có khác
                nhau chỗ nào không — mất công vì chúng giống hệt.
              */}
              {(tepChinh || game.banTai.length > 0) && (
                <p className="mt-3">
                  <NutTaiDau nhan="Tải về" dichLui="#tai" taiKhoan={nguoi?.tenHienThi ?? null}
                    game={{ ten: game.ten, icon: game.icon, nhaPhatTrien: tenHang, doTuoi: game.doTuoi }}
                    tep={tepChinh && banMoiNhat
                      ? {
                          id: tepChinh.id, loai: tepChinh.loai,
                          dungLuong: tepChinh.dungLuong != null ? Number(tepChinh.dungLuong) : null,
                          soHieu: banMoiNhat.soHieu, heMay: MO_TA_HE[he[0]].ten,
                        }
                      : null} />
                </p>
              )}
            </div>
          </div>

          <HangSoLieu o={soLieu} />
        </header>

        <section id="tai" className="scroll-mt-20 space-y-3">
          {/* Đầu đề nhỏ, không phải đầu đề trang: từ đợt này nút tải chính đã
              lên đầu trang, nên khối này là chỗ CHỌN bản chứ không còn là việc
              chính — một đầu đề 22px ở đây tranh vai với tên game. */}
          <h2 className="tieu-de-nho lg:sr-only">Tải về</h2>
          {/*
            `nutChinhDam` — CHỈ MỘT NÚT TÔ ĐẶC TRÊN CẢ TRANG.

            Game một hệ máy thì nút ở đầu trang đã đi thẳng tới trang tải, nên
            nút trong khung này hạ xuống dáng viền: hai nút xanh đặc cách nhau
            một màn hình là mời bấm nhầm, và người bấm không đoán được hai nút
            khác nhau chỗ nào. Game nhiều hệ thì ngược lại — nút đầu trang chỉ
            đưa xuống đây, nên nút tô đặc phải nằm ở đây, sau khi đã chọn hệ.
          */}
          <KhungTai ban={banXem} taiKhoan={nguoi?.tenHienThi ?? null} nutChinhDam={he.length > 1}
            game={{ ten: game.ten, icon: game.icon, nhaPhatTrien: tenHang, doTuoi: game.doTuoi }} />
        </section>
      </div>

      <div className="mt-8 lg:mt-0">
        <TabGame duongDanGame={game.duongDan} soChuDe={game._count.chuDe} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

