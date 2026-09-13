import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { docBanXem } from '@/lib/ban-tai-xem';
import { DANG_HIEN } from '@/lib/danh-muc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { NutChiaSe } from '@/components/game/NutChiaSe';
import { NutLui } from '@/components/game/NutLui';
import { TabGame } from '@/components/game/TabGame';
import { HangSoLieu, dungSoLieu } from '@/components/game/HangSoLieu';
import { NutTaiDau } from '@/components/game/NutTaiDau';
import { DongLuanPhien } from '@/components/game/DongLuanPhien';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { diemSao } from '@/lib/tien-ich';
import { mauCuaGame } from '@/lib/mau-game';
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
      // Một tấm ảnh chụp để làm bìa dự phòng — xem chỗ dựng dải bìa bên dưới.
      anhChup: {
        orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], take: 1,
        select: { duongDan: true },
      },
      _count: { select: { chuDe: true } },
    },
  });
  if (!game) notFound();

  // Dãy bản tải đọc bằng hàm chung với tab Thông tin — xem `ban-tai-xem.ts`.
  const banXem = await docBanXem(game.id);

  const sao = diemSao(game.tongSao, game.soLuotDanhGia);

  const anhBia = game.bia ?? game.anhChup[0]?.duongDan ?? null;
  const mauBia = mauCuaGame(game.ten);

  /*
   * Tên hãng bày trên tấm xác nhận: ưu tiên tên tác giả đã đăng ký, rồi mới
   * tới chuỗi `nhaPhatTrien` gõ tay. Cùng một lẽ với liên kết dưới tên game —
   * tài khoản là thật, còn một chuỗi gõ tay thì hai cách gõ thành hai hãng.
   */
  const tenHang = game.tacGia?.tenTacGia ?? game.tacGia?.tenHienThi ?? game.nhaPhatTrien;
  const duongDanHang = game.tacGia
    ? `/tac-gia/${game.tacGia.tenDangNhap}`
    : game.nhaPhatTrien
      ? `/nha-phat-trien/${encodeURIComponent(game.nhaPhatTrien)}`
      : null;

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
    dungLuong: banXem[0]?.dungLuong ?? null,
    soHieu: banXem[0]?.soHieu ?? null,
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
  const he = [...new Set(banXem.map((b) => b.heMay))] as MaHeMay[];
  const banMoiNhat = banXem[0];

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

  return (
    /*
     * MỘT CỘT, GIỮA TRANG — y như trang ứng dụng của App Store.
     *
     * Bản trước chia máy bàn làm hai cột: cột trái 300px dính lại giữ biểu
     * tượng, số liệu và cả khung tải; cột phải cuộn. Nhìn tận mắt mới thấy nó
     * hỏng ở đâu: hàng số liệu bị bóp trong 300px nên ô "Lượt tải" đứt ngay
     * giữa chữ, khung tải ăn hết chỗ đẹp nhất của trang, và dưới nó là một
     * khoảng trắng cao bằng cả màn hình vì cột trái hết nội dung trước cột
     * phải. App Store không có cột nào như thế: một cột, rộng chừng 1000px,
     * mọi thứ xếp dọc theo đúng thứ tự người ta đọc.
     *
     * Thứ tự ấy giữ nguyên ở cả hai khổ máy, nên không còn hai bố cục phải
     * trông chừng song song nữa.
     */
    <div className="mx-auto max-w-[1000px]">
      <div className="space-y-5">
        {/*
          DẢI BÌA ĐẦU TRANG — thứ mở màn trang ứng dụng của App Store.

          Trang ứng dụng nào của họ cũng mở bằng một dải hình trải hết bề ngang,
          hai nút lùi và chia sẻ nổi đè lên, rồi phần biểu tượng và tên mới bắt
          đầu bên dưới như một tấm khác chồng lên. Thiếu dải ấy thì trang mở ra
          bằng một hàng chữ, và mọi game trông giống hệt nhau ở nhịp đầu tiên —
          đúng chỗ người ta quyết định có đọc tiếp hay không.

          BA MỨC, lấy cái nào có trước: ảnh bìa người bán hàng tự chọn; không có
          thì lấy TẤM ẢNH CHỤP ĐẦU TIÊN của chính game (ảnh thật của game ấy,
          không phải hình bịa); không có nữa thì một dải màu dựng từ chính tên
          game — cùng bảng màu với ô biểu tượng khi game chưa có icon, nên hai
          thứ ấy luôn hợp màu nhau.

          Vệt tối hắt từ mép trên xuống là để hai nút trắng không biến mất trên
          một tấm bìa sáng màu — nút lùi biến mất là người ta kẹt lại trang.
        */}
        <div data-viec="bia" className="relative -mx-4 sm:mx-0">
          {anhBia ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={anhBia} alt="" fetchPriority="high"
              className="aspect-[16/9] w-full object-cover sm:aspect-[3/1] sm:rounded-the" />
          ) : (
            <div aria-hidden className="aspect-[16/9] w-full sm:aspect-[3/1] sm:rounded-the"
              style={{
                backgroundImage:
                  `radial-gradient(120% 100% at 15% 0%, rgb(255 255 255 / .22), transparent 60%),`
                  + `linear-gradient(145deg, ${mauBia.tu}, ${mauBia.den})`,
              }} />
          )}
          <span aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent sm:rounded-t-the" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <NutLui />
            <NutChiaSe ten={game.ten} duongDan={game.duongDan} />
          </div>
        </div>

        {/* Tấm nội dung CHỒNG LÊN mép dưới dải bìa và bo hai góc trên: đó là
            nhịp khiến dải bìa trông như nằm SAU trang chứ không phải một cái
            ảnh dán vào đầu trang. */}
        <header className="relative -mt-5 rounded-t-[22px] bg-nen px-4 pt-4 sm:-mt-7 sm:px-0 sm:pt-0">
          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            {/*
              HAI CỠ BIỂU TƯỢNG, hai thẻ.

              App Store để biểu tượng rất to ở đầu trang ứng dụng — trên web nó
              chiếm gần một phần tư bề ngang cột. Một ô 104px giữa cột 1000px
              thì trang mở ra trông như một hàng danh sách bị phóng to, không
              ra trang của riêng game ấy.

              Cỡ truyền bằng `px` (xem `BieuTuongGame`), mà `px` thì không đổi
              theo khổ màn hình được — nên hai thẻ, mỗi khổ hiện một. Ảnh mang
              `alt=""` nên bộ đọc màn hình không đọc thành hai lần.
            */}
            <BieuTuongGame ten={game.ten} icon={game.icon} co={104} className="sm:hidden" />
            <BieuTuongGame ten={game.ten} icon={game.icon} co={148} className="hidden sm:block" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[23px] font-bold leading-[1.15] tracking-tight sm:text-[30px]">{game.ten}</h1>
              {game.tenViet && <p className="phu mt-0.5">{game.tenViet}</p>}
              {/*
                MỘT DÒNG LUÂN PHIÊN: tên hãng, rồi từng thể loại, rồi bản Việt
                hoá — đúng lối App Store xoay dòng dưới tên ứng dụng.

                Trước đây ba thứ ấy chia làm hai dòng: tên hãng một dòng màu
                xanh, thể loại một dòng xám. Hai dòng ăn hai lần chiều cao ở
                đúng khúc đầu trang chật nhất, mà nhồi cả vào một dòng thì dài
                quá phải cắt cụt. Xoay thì thứ nào cũng có lượt, mà bố cục
                đứng yên — xem `DongLuanPhien.tsx` để biết nó dừng xoay lúc
                nào, kẻo chữ đổi ngay dưới ngón tay đang hạ xuống.
              */}
              <DongLuanPhien className="mt-1.5" muc={[
                ...(tenHang && duongDanHang ? [{ ma: 'hang', chu: tenHang, dich: duongDanHang }] : []),
                ...game.theLoai.map((t) => ({
                  ma: t.theLoai.duongDan,
                  chu: t.theLoai.ten,
                  dich: `/the-loai/${t.theLoai.duongDan}`,
                })),
                ...(game.vietHoa
                  ? [{ ma: 'viet-hoa', chu: 'Có bản Việt hoá', dich: '/duyet?viet-hoa=1' }]
                  : []),
              ]} />

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
              {/*
                MỘT NÚT, KHÔNG PHẢI HAI.

                Bản vừa rồi dựng hai thẻ nút — một cho khổ hẹp, một cho khổ
                rộng — rồi ẩn bớt bằng lớp CSS. Bài kiểm 02 bắt ngay: nó đếm
                nút tô đặc trên cả trang và thấy HAI, vì lớp `sm:hidden` chỉ
                giấu con mắt chứ thẻ vẫn nằm đó. Hai lối tải trên một trang là
                đúng cái mà phép đếm ấy sinh ra để chặn.

                Nên nút ở lại trong cột chữ, và khổ rộng thì đẩy nó sát mép
                phải — chỗ nút giá của trang ứng dụng trên web App Store.
              */}
              {(tepChinh || banXem.length > 0) && (
                <p className="mt-3 sm:flex sm:justify-end">
                  <NutTaiDau nhan="Tải về" dichLui={`/game/${game.duongDan}#tai`} taiKhoan={nguoi?.tenHienThi ?? null}
                    game={{ ten: game.ten, icon: game.icon, nhaPhatTrien: tenHang, doTuoi: game.doTuoi }}
                    tep={tepChinh && banMoiNhat
                      ? {
                          id: tepChinh.id, loai: tepChinh.loai,
                          dungLuong: tepChinh.dungLuong,
                          soHieu: banMoiNhat.soHieu, heMay: MO_TA_HE[he[0]].ten,
                        }
                      : null} />
                </p>
              )}
            </div>
          </div>

          <HangSoLieu o={soLieu} />
        </header>

      </div>

      {/* Khung tải nay nằm TRONG tab Thông tin, không còn ở khung chung: App
          Store để phần lấy ứng dụng trong mạch nội dung chứ không dựng một
          bảng điều khiển riêng, và ở tab Diễn đàn thì cái bảng ấy chỉ chen
          giữa người đọc và chủ đề họ đang mở. Nút "Tải về" ở đầu trang vẫn
          theo suốt mọi tab. */}
      <div className="mt-7">
        <TabGame duongDanGame={game.duongDan} soChuDe={game._count.chuDe} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

