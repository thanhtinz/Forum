import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlignLeft, ChevronRight, Info, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { ANH_CHIA_SE } from '@/lib/dia-chi-goc';
import { PhoDiem } from '@/components/game/PhoDiem';
import { tomTatDanhGia } from '@/lib/tom-tat-danh-gia';
import { SaoNam } from '@/components/game/SaoNam';
import { ODanhGia } from '@/components/game/ODanhGia';
import { BaiDanhGia, CHON_DANH_GIA } from '@/components/game/BaiDanhGia';
import { traLoiDanhGia } from '@/app/(quan-tri)/quan-tri/viec';
import { tacGiaTraLoiDanhGia } from '@/app/(tac-gia)/quan-ly/viec';
import { KeAnhChup } from '@/components/game/KeAnhChup';
import { KeThe } from '@/components/game/KeThe';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { TamTai } from '@/components/game/TamTai';
import { docBanXem } from '@/lib/ban-tai-xem';
import { TamDanhGia } from '@/components/game/TamDanhGia';
import { MoTaGame } from '@/components/game/MoTaGame';
import { Ke } from '@/components/game/Ke';
import { TheSuKien } from '@/components/game/TheSuKien';
import { SU_KIEN_TREN_TRANG } from '@/lib/su-kien-const';
import { KhoiGap } from '@/components/KhoiGap';
import { MO_TA_HE, NHAC_KHI_CAI, type MaHeMay } from '@/lib/he-may';
import { cachDay, catChu, gonSo, gop } from '@/lib/tien-ich';
import { bocChu, dungChuDam } from '@/lib/chu-dam';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MO_TA_TUOI, napDoTuoi } from '@/lib/do-tuoi-const';
import { TOI_DA_ANH_CHUP } from '@/lib/luat-anh-const';
import { PHIM_TOI_DA } from '@/lib/phim-const';

export const dynamic = 'force-dynamic';

/*
 * THẺ META CỦA MỘT GAME — gồm cả ẢNH hiện ra khi dán liên kết.
 *
 * Dán liên kết game vào Zalo hay Messenger là cách người ta gửi game cho nhau
 * ở đây, và tấm ảnh trong ô xem trước quyết định người kia có bấm vào hay
 * không. Trước đợt này mọi game đều mượn chung `anh-chia-se.png` của cửa hàng,
 * nên mười liên kết gửi đi thì cả mười trông y hệt nhau — tức là tấm ảnh ấy
 * không nói được game nào cả.
 *
 * Thứ tự lấy đúng như dải bìa đầu trang: ảnh bìa, rồi ảnh chụp đầu tiên, rồi
 * biểu tượng. Không có gì thì lặp lại tấm chung của cửa hàng.
 *
 * PHẢI LẶP LẠI, không trông vào bố cục gốc: Next ghép thẻ meta theo lối THAY
 * CẢ CỤM — trang con khai `openGraph` là cụm ấy đè hẳn lên cụm của bố cục gốc
 * chứ không trộn từng trường. Bản đầu của đợt này quên mất chuyện ấy nên game
 * chưa có ảnh riêng mất luôn ô xem trước, và bài kiểm 02 bắt được ngay.
 */
export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: {
      ten: true, gioiThieu: true, icon: true, bia: true,
      anhChup: { orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], take: 1, select: { duongDan: true } },
    },
  });
  if (!g) return { title: 'Không tìm thấy game' };

  const moTa = g.gioiThieu ? catChu(bocChu(g.gioiThieu), 160) : undefined;
  const anh = g.bia ?? g.anhChup[0]?.duongDan ?? g.icon;

  return {
    title: g.ten,
    description: moTa,
    openGraph: {
      title: g.ten,
      description: moTa,
      images: [anh ? { url: anh, alt: g.ten } : ANH_CHIA_SE],
    },
    // Ô xem trước to, không phải cái thẻ vuông bé cạnh dòng chữ: ảnh game là
    // thứ đáng nhìn ở đây.
    twitter: { card: 'summary_large_image' },
  };
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
      id: true, ten: true, icon: true, doTuoi: true, tacGiaId: true,
      gioiThieu: true, namPhatHanh: true,
      ngonNgu: true, dangLuc: true, nhaPhatTrien: true,
      theLoai: { select: { theLoai: { select: { ten: true, duongDan: true } } } },
      tacGia: { select: { tenDangNhap: true, tenHienThi: true, tenTacGia: true } },
      // Lấy đúng trần luật định — game cũ lỡ có hơn thì cũng chỉ bày chừng ấy.
      anhChup: {
        orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], take: TOI_DA_ANH_CHUP,
        select: { id: true, duongDan: true, chuThich: true, heMay: true },
      },
      phim: {
        orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
        take: PHIM_TOI_DA,
        select: { id: true, duongDan: true, anhBia: true },
      },
      /*
       * Sự kiện ĐANG CÒN HẠN, sắp tới trước.
       *
       * Lọc theo ngày kết thúc ngay trong câu truy vấn: một sự kiện hết hạn mà
       * còn nằm trên trang thì tệ hơn là không có sự kiện nào — nó nói với
       * người xem rằng trang này lâu rồi không ai ngó tới.
       */
      suKien: {
        where: { hien: true, ketThuc: { gte: new Date() } },
        orderBy: [{ batDau: 'asc' }, { id: 'asc' }],
        take: SU_KIEN_TREN_TRANG,
        select: {
          id: true, loai: true, tieuDe: true, moTaNgan: true, anh: true,
          batDau: true, ketThuc: true,
        },
      },
      /*
       * Bản MỚI NHẤT CÓ GHI "có gì mới", để dựng mục "Có gì mới".
       *
       * Lọc `doiMoi: { not: null }` ngay trong câu truy vấn chứ không lấy bản
       * mới nhất rồi xem nó có ghi gì không: game cũ thường chỉ ghi ghi chú
       * cho một hai bản giữa dãy, nên lấy bản mới nhất trước rồi xét sau thì
       * phần lớn lượt ra tay trắng dù trong dãy vẫn có bản có ghi.
       */
      banTai: {
        where: { doiMoi: { not: null } },
        orderBy: [{ moiNhat: 'desc' }, { ngayRa: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { heMay: true, soHieu: true, ngayRa: true, doiMoi: true },
      },
      _count: { select: { banTai: true } },
    },
  });
  if (!game) notFound();

  const nguoi = await nguoiHienTai();

  const [phanBo, danhGia, cuaToi, loiBinhTomTat, soHe, banXem, cungTacGia] = await Promise.all([
    db.danhGia.groupBy({ by: ['sao'], where: { gameId: game.id }, _count: { _all: true } }),
    db.danhGia.findMany({
      where: { gameId: game.id, noiDung: { not: null }, ...(locSao ? { sao: locSao } : {}) },
      /*
       * SẮP THEO "HỮU ÍCH NHẤT", không theo mới nhất — đúng lối App Store.
       *
       * Kệ này chỉ bày được năm bài, nên câu hỏi là: năm bài NÀO? Mới nhất thì
       * một người vừa gõ "hay" lúc nãy chiếm mất chỗ của bài kể rõ game chạy
       * thế nào trên máy yếu. Khoá phụ vẫn là ngày, nên game chưa ai bấm hữu
       * ích thì kệ tự quay về mới nhất chứ không ra thứ tự ngẫu nhiên.
       */
      orderBy: [{ soHuuIch: 'desc' }, { taoLuc: 'desc' }, { id: 'desc' }],
      // Năm bài là bản nếm thử; đọc hết thì mở tấm trượt, không rời trang.
      take: 5,
      select: CHON_DANH_GIA,
    }),
    nguoi
      ? db.danhGia.findUnique({
          where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
          select: { sao: true, tieuDe: true, noiDung: true },
        })
      : null,
    /*
     * LỜI BÌNH DÙNG ĐỂ DỰNG ĐOẠN TÓM TẮT.
     *
     * Lấy riêng chứ không dùng lại năm bài trên kệ: tóm tắt mà chỉ đọc năm bài
     * thì nó không phải tóm tắt, nó là cái kệ viết lại bằng chữ khác. Chặn ở
     * 200 bài mới nhất vì một game nghìn bài thì hai trăm bài gần đây đã đủ
     * nói game ấy nay đang thế nào — mà quét cả nghìn bài mỗi lần mở trang thì
     * không đáng.
     */
    db.danhGia.findMany({
      where: { gameId: game.id, noiDung: { not: null } },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: 200,
      select: { noiDung: true },
    }),
    db.banTai.findMany({ where: { gameId: game.id }, distinct: ['heMay'], select: { heMay: true } }),
    docBanXem(game.id),
    /*
     * GAME KHÁC CỦA CHÍNH NGƯỜI LÀM RA GAME NÀY.
     *
     * App Store để kệ "More By This Developer" ở cuối trang ứng dụng, và nó
     * khác hẳn kệ "game tương tự" đã bỏ đi: kệ kia đoán mò theo thể loại và
     * kéo người ta ra khỏi thứ họ đang xem, còn kệ này trả lời một câu người
     * ta tự hỏi sau khi đọc xong mô tả — "ai làm cái này, họ còn làm gì nữa".
     *
     * Gom theo TÀI KHOẢN tác giả nếu có; không có thì đành theo chuỗi tên hãng
     * gõ tay, vì game cũ hai mươi năm trước không ai đứng tên cả. Không có cả
     * hai thì kệ trống và không hiện.
     */
    (async () => {
      const cua = game.tacGiaId
        ? { tacGiaId: game.tacGiaId }
        : game.nhaPhatTrien
          ? { nhaPhatTrien: game.nhaPhatTrien }
          : null;
      if (!cua) return [];
      return db.game.findMany({
        where: { ...cua, ...DANG_HIEN, id: { not: game.id } },
        orderBy: [{ soLuotTai: 'desc' }, { id: 'asc' }],
        take: 12,
        select: CHON_THE,
      });
    })(),
  ]);

  // Đếm lượt xem sau khi đã lấy đủ dữ liệu, và không chờ kết quả: hỏng bộ đếm
  // thì cùng lắm lệch một con số, còn chặn cả trang lại thì hỏng cả trang.
  void db.game.update({
    where: { id: game.id }, data: { soLuotXem: { increment: 1 } }, select: { id: true },
  }).catch(() => {});

  // Ô trả lời chỉ VẼ ra cho quản trị; còn chặn thật nằm trong `traLoiDanhGia`,
  // vì một hàm `'use server'` thì ai cũng gọi được, không cần thấy nút.
  const laQuanTri = nguoi?.vaiTro === 'QUAN_TRI';
  /*
   * AI ĐÁP ĐƯỢC BÀI ĐÁNH GIÁ NGAY TẠI ĐÂY.
   *
   * Tác giả của chính game này đáp được, không phải chỉ ban quản trị: người
   * chơi viết lời ngay dưới trang game, nên chỗ đáp gọn nhất cũng là chỗ ấy —
   * bắt tác giả vòng qua bảng riêng mới nói lại được một câu thì phần lớn sẽ
   * chẳng nói gì.
   *
   * Hai vai gọi hai hàm khác nhau vì chúng kiểm quyền khác nhau; câu `if` ở
   * đây chỉ quyết ĐỊNH BÀY nút hay không, còn cửa thật nằm trong từng hàm.
   */
  const dapDanhGia = laQuanTri ? traLoiDanhGia
    : nguoi && game.tacGiaId === nguoi.id ? tacGiaTraLoiDanhGia
      : null;

  /*
   * Có TÁC GIẢ thì trỏ về trang tác giả, không trỏ về trang gom theo tên hãng.
   * Trang tên hãng gom theo một CHUỖI ghi trên từng game nên hai cách gõ thành
   * hai hãng; trang tác giả gom theo tài khoản nên nó là thật.
   */
  /*
   * Người đang xem đã bấm "Hữu ích" cho bài nào — hỏi MỘT câu cho cả kệ.
   *
   * Hỏi lẻ từng bài là năm lượt đi về cơ sở dữ liệu để nhận về năm chữ "chưa",
   * vì phiếu hữu ích thưa hơn bài đánh giá rất nhiều. Khách chưa đăng nhập thì
   * khỏi hỏi câu nào.
   */
  const daBam = nguoi && danhGia.length > 0
    ? new Set((await db.danhGiaHuuIch.findMany({
        where: { nguoiId: nguoi.id, danhGiaId: { in: danhGia.map((d) => d.id) } },
        select: { danhGiaId: true },
      })).map((v) => v.danhGiaId))
    : new Set<string>();

  const tomTat = tomTatDanhGia(
    Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all])),
    loiBinhTomTat.map((b) => b.noiDung ?? ''),
  );

  /** Có gì để xem trước không — quyết định khối mô tả mượn đầu mục nào. */
  const coAnhXem = game.anhChup.length > 0 || game.phim.length > 0;

  const tenTacGia = game.tacGia
    ? game.tacGia.tenTacGia ?? game.tacGia.tenHienThi
    : game.nhaPhatTrien;
  const duongDanTacGia = game.tacGia
    ? `/tac-gia/${game.tacGia.tenDangNhap}`
    : game.nhaPhatTrien
      ? `/nha-phat-trien/${encodeURIComponent(game.nhaPhatTrien)}`
      : null;

  const moiNhat = game.banTai[0] ?? null;

  const gom = phanBo.reduce((t, p) => t + p._count._all, 0);
  const tongSao = phanBo.reduce((t, p) => t + p.sao * p._count._all, 0);
  const sao = gom > 0 ? Math.round((tongSao / gom) * 10) / 10 : 0;

  return (
    /*
     * VẠCH KẺ MẢNH GIỮA CÁC MỤC, không phải khoảng trắng suông.
     *
     * Trang ứng dụng trên máy Mac ngăn "What's New", "Preview", phần mô tả và
     * phần đánh giá bằng đúng một sợi kẻ mảnh chạy hết bề ngang cột — cùng thứ
     * sợi kẻ đã kẹp trên dưới hàng số liệu. Để khoảng trắng suông thì ở cột
     * rộng 1000px mắt không còn thấy mục nào hết ở đâu; sợi kẻ trả lời đúng
     * câu ấy mà không tốn một điểm ảnh màu nào.
     */
    <div className="divide-y divide-vien [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 [&>*]:py-7">
      {/*
        SỰ KIỆN ĐỨNG ĐẦU TRANG, trên cả "Có gì mới" và kệ ảnh.

        Đúng thứ tự App Store, và lẽ của nó là chuyện HẠN DÙNG. Mô tả game nói
        game LÀ GÌ — thứ không đổi suốt hai mươi năm. Ghi chú bản mới thì sống
        được vài tháng. Còn sự kiện hết hạn trong vài ngày, nên nó phải đứng
        trên cùng: cuộn xuống đủ sâu mới thấy thì sự kiện đã tàn.
      */}
      {game.suKien.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Sự kiện</h2>
          <Ke nhan="sự kiện" className="-mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
            {game.suKien.map((s) => (
              <TheSuKien key={s.id} duongDanGame={duongDan} trongKe
                s={{
                  id: s.id, loai: s.loai, tieuDe: s.tieuDe, moTaNgan: s.moTaNgan, anh: s.anh,
                  batDau: s.batDau.toISOString(), ketThuc: s.ketThuc.toISOString(),
                }} />
            ))}
          </Ke>
        </section>
      )}

      {/*
        "CÓ GÌ MỚI" ĐỨNG TRÊN KỆ ẢNH, ngay sau mục sự kiện.

        Đúng thứ tự App Store, và lẽ của nó: phần giới thiệu với kệ ảnh là thứ
        người MỚI tới xem, mà người mới thì mỗi game chỉ có một lần; còn "có gì
        mới" là thứ người ĐÃ tải quay lại đọc, và họ quay lại nhiều lần. Xếp
        theo số lần người ta thật sự cần đọc, không xếp theo thứ tự mình viết.

        Nhắc lại y nguyên phần ghi chú của bản mới nhất — chi tiết từng bản vẫn
        nằm trong tấm tải, và chính ĐẦU MỤC là lối xuống đó.
      */}
      {moiNhat?.doiMoi && (
        <section>
          {/* Đầu mục kèm mũi tên là lối đi luôn, không có thêm liên kết nào
              bên phải: xem đổi gì rồi tải ngay bản ấy là một mạch, chứ không
              phải đọc ở đây rồi đi tìm nút tải ở chỗ khác. */}
          <TamTai ban={banXem} dang="dau-de" nhan="Có gì mới"
            taiKhoan={nguoi?.tenHienThi ?? null}
            game={{ ten: game.ten, icon: game.icon, nhaPhatTrien: tenTacGia, doTuoi: game.doTuoi }} />

          {/*
            SỐ HIỆU BẢN VÀ THỜI GIAN THÀNH MỘT HÀNG RIÊNG NGAY DƯỚI ĐẦU MỤC,
            bản trái ngày phải — đúng như App Store trên iPhone.

            Từng để hai thứ ấy nằm dồn bên phải ngang hàng với lời ghi chú, và
            nó sai ở chỗ: lời ghi chú xuống dòng tự do nên cột phải lúc cao lúc
            thấp, hàng chữ chính thì bị bóp lại còn hai phần ba bề ngang.
          */}
          {/* Cả hai đầu hàng đều là chữ MỜ, không in đậm bên nào: đây là hàng
              tra cứu, còn thứ đáng đọc là lời ghi chú ngay dưới. In đậm số hiệu
              bản là kéo mắt về đúng thứ ít cần đọc nhất. */}
          <div className="mt-1.5 flex items-baseline justify-between gap-4">
            <span className="phu">
              Bản {moiNhat.soHieu}
              {soHe.length > 1 && ` · ${MO_TA_HE[moiNhat.heMay as MaHeMay]?.ten ?? moiNhat.heMay}`}
            </span>
            {moiNhat.ngayRa && <span className="phu shrink-0">{cachDay(moiNhat.ngayRa)}</span>}
          </div>

          <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{moiNhat.doiMoi}</p>
        </section>
      )}

      {/*
        ẢNH CHỤP VÀ LỜI GIỚI THIỆU LÀ MỘT KHỐI, không phải hai mục rời.

        App Store xếp thế: kệ ảnh, một vạch mảnh, rồi chữ chạy thẳng xuống —
        phần mô tả không có đầu mục riêng. Lý do rất thực: hai thứ ấy trả lời
        cùng một câu hỏi "game này là game gì", mà tách thành hai mục có hai
        đầu đề thì người đọc phải bước qua một cái đầu đề vô nghĩa ("Giới
        thiệu" thì giới thiệu cái gì, chẳng phải cả trang đang giới thiệu game
        à) để tới đúng đoạn chữ họ đang định đọc.

        Game chưa có ảnh nào thì mới cần đầu đề "Giới thiệu": lúc ấy khối này
        không còn đầu mục nào khác để mượn.

        MỘT KHỐI MÔ TẢ DUY NHẤT, không ba ô rời. Từng có ba ô: Giới thiệu,
        Cách chơi, Cần biết trước khi tải — sinh ra từ hồi mô tả còn là chữ
        trần, không xuống dòng nổi một đầu đề, nên phải lấy chính biểu mẫu làm
        cấu trúc. Nay ô mô tả có đầu đề, danh sách và trích dẫn, nên người viết
        tự chia phần theo game họ đang viết.
      */}
      {(coAnhXem || game.gioiThieu || game.theLoai.length > 0) && (
        <section>
          {coAnhXem && (
            <>
              <h2 className="tieu-de mb-3">Xem trước</h2>
              <KeAnhChup anh={game.anhChup} phim={game.phim} />
            </>
          )}

          {game.gioiThieu && (
            <div className={gop(coAnhXem && 'vach mt-5 border-t pt-5')}>
              {!coAnhXem && <h2 className="tieu-de mb-2">Giới thiệu</h2>}
              <MoTaGame html={dungChuDam(game.gioiThieu)} />
            </div>
          )}

          {/*
            THỂ LOẠI THÀNH CHIP BẤM ĐƯỢC, ngay dưới phần mô tả.

            App Store để đúng dãy chip ấy ở đây, và nó không phải trang trí:
            người vừa đọc xong mô tả và thấy hợp gu thì thứ họ muốn làm tiếp là
            "cho tôi xem thêm game kiểu này" — chip là lối đi thẳng tới đó.

            Bảng thông tin phía dưới vẫn liệt kê thể loại thành chữ, nhưng đó
            là chỗ TRA CỨU, đọc theo hàng cùng độ tuổi và dung lượng; hai chỗ
            phục vụ hai việc khác nhau.
          */}
          {game.theLoai.length > 0 && (
            <div className={gop('flex flex-wrap gap-2', (coAnhXem || game.gioiThieu) && 'mt-4')}>
              {game.theLoai.map((t) => (
                <Link key={t.theLoai.duongDan} href={`/the-loai/${t.theLoai.duongDan}`}
                  className="chip">
                  {t.theLoai.ten}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/*
        HÀNG NHÀ PHÁT TRIỂN — một dòng bấm được, có mũi tên.

        Tên hãng đã in nhỏ dưới tên game ở đầu trang, nhưng ở đó nó là một
        mẩu chú thích. Hàng này là một LỐI ĐI: mũi tên nói rõ bấm vào sẽ sang
        chỗ khác, và nó nằm ngay sau phần mô tả — đúng lúc người đọc vừa thích
        game này và nảy ra ý "hãng này còn làm gì nữa".
      */}
      {duongDanTacGia && (
        <Link href={duongDanTacGia}
          className="the flex items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-nhan">{tenTacGia}</span>
            <span className="phu mt-0.5 block">Nhà phát triển</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-mo" aria-hidden />
        </Link>
      )}

      {/* Điểm to bên trái, phổ điểm bên phải — bố cục của CH Play. Chỉ in con
          số trung bình thì không nói được "4,3 này là do ai cũng cho 4, hay do
          một nửa cho 5 và một nửa cho 2". */}
      <section>
        {/* "Xem tất cả" nằm CẠNH ĐẦU ĐỀ, đúng chỗ App Store để "See All" —
            lướt qua đầu mục là biết ngay có chỗ đọc hết. */}
        <div className="mb-3">
          {gom > 0 ? (
            <TamDanhGia gameId={game.id} duongDan={duongDan} tong={gom} sao={sao}
              phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))}
              banDau={danhGia.map((d) => ({ ...d, toiDaBam: daBam.has(d.id) }))}
              dangLien banHienTai={banXem[0]?.soHieu ?? null} nguoiXemId={nguoi?.id ?? null} />
          ) : (
            /* Chưa ai đánh giá thì đầu mục là chữ trần: mũi tên hứa có chỗ đi
               tiếp, mà mở ra chỉ gặp một tấm rỗng. */
            <h2 className="tieu-de">Đánh giá</h2>
          )}
        </div>
        <PhoDiem sao={sao} tong={gom} locSao={locSao}
          phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))} />

        {/*
          TÓM TẮT ĐÁNH GIÁ — mấy dòng dựng từ chính những bài ở dưới.

          App Store để đúng đoạn này ngay dưới điểm trung bình, và lý do thì rõ:
          "4,2" không nói được người ta khen gì chê gì, mà đọc hai chục bài thì
          chẳng ai đọc. Câu cuối nói rõ đoạn này do máy đếm ra, không phải lời
          của ban quản trị — xem `tom-tat-danh-gia.ts` để biết vì sao nó đếm
          chứ không nghĩ hộ.
        */}
        {tomTat && (
          <div className="vach mt-4 border-t pt-4">
            <p className="text-[13px] leading-relaxed">
              <span className="font-bold">Tóm tắt đánh giá</span> — {tomTat}
            </p>
            <p className="phu mt-1.5 flex items-center gap-1.5">
              <AlignLeft size={13} aria-hidden />
              Tự động tổng hợp từ đánh giá của người chơi
            </p>
          </div>
        )}

        {locSao !== null && (
          <p className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="text-mo">Đang xem đánh giá {locSao} sao</span>
            <Link href="?" scroll={false} className="font-semibold text-nhan hover:underline">
              Xem tất cả
            </Link>
          </p>
        )}

        {danhGia.length === 0 && locSao !== null && (
          <p className="phu mt-5">Không có bài nào {locSao} sao kèm lời nhận xét.</p>
        )}

        {/*
          KỆ THẺ CUỘN NGANG, không phải danh sách dọc.

          Đây là dáng App Store dùng cho phần đánh giá ở cả iPhone lẫn máy Mac,
          và nó không phải chuyện trang trí: danh sách dọc bắt người đang cân
          nhắc tải phải cuộn qua hết bài này tới bài kia mới tới được phần
          thông tin, còn kệ thì năm bài chỉ chiếm một tầm mắt, ai muốn đọc tiếp
          thì quẹt ngang.
        */}
        {danhGia.length > 0 && (
          <>
            <h3 className="mt-5 text-[15px] font-bold">Bài hữu ích nhất</h3>
            <Ke nhan="đánh giá" className="mt-2.5 -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
              {danhGia.map((d) => (
                <div key={d.id} className="the w-[300px] shrink-0 p-4 sm:w-[340px]">
                  <BaiDanhGia d={d} nguoiXemId={nguoi?.id ?? null} dap={dapDanhGia} gon
                    banDauBam={daBam.has(d.id)} />
                </div>
              ))}
            </Ke>
          </>
        )}

        {/* Khối chấm sao nằm SAU kệ, đúng chỗ App Store để "Tap to Rate": vào
            phần đánh giá là để nghe người khác nói trước đã, mời viết ngay từ
            đầu thì đẩy hết tiếng nói ấy xuống dưới một màn hình. */}
        <div className="vach mt-6 border-t pt-5">
          <ODanhGia gameId={game.id} tenGame={game.ten} icon={game.icon} duongDan={duongDan}
            tacGia={tenTacGia ?? 'Không rõ nhà phát triển'}
            banDau={cuaToi} daDangNhap={!!nguoi} />
        </div>
      </section>

      {/*
        Bảng thông tin chỉ giữ thứ CHƯA nói ở đâu khác trên trang.
        Nhà phát triển đã in màu nhấn dưới tên game; hệ máy đã có ở dãy chip;
        còn năm phát hành và ngôn ngữ nay nằm trên hàng số liệu ngay dưới tên
        game — in lại ở đây thì bảng này chỉ là một bản sao mờ của hàng ấy.
      */}
      <section>
        <h2 className="tieu-de mb-3">Thông tin</h2>
        {/*
          LƯỚI CẶP NHÃN–GIÁ TRỊ, không phải bảng một cột.

          Một cột giữa 1000px thì nhãn nằm mép trái, giá trị nằm mép phải, và
          mắt phải lia hết bề ngang màn hình cho mỗi dòng — đọc năm dòng là lia
          năm lượt. App Store trên máy Mac xếp phần này thành lưới hai, ba cột,
          mỗi ô nhãn trên giá trị dưới, đọc theo cụm chứ không theo hàng dài.
        */}
        <dl className="the grid gap-x-8 gap-y-4 p-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {/* "Chạy được trên" và "Thể loại" là hai dòng App Store luôn có
              (Compatibility, Category) mà hàng số liệu trên đầu trang KHÔNG
              có chỗ bày — nên đây không phải chép lại, đây là phần bù. */}
          <Dong nhan="Chạy được trên"
            giaTri={soHe.map((h) => MO_TA_HE[h.heMay as MaHeMay]?.ten ?? h.heMay).join(', ') || '—'} />
          {game.theLoai.length > 0 && (
            <Dong nhan="Thể loại" giaTri={game.theLoai.map((t) => t.theLoai.ten).join(', ')} />
          )}
          {moiNhat && (
            <Dong nhan="Bản mới nhất"
              giaTri={moiNhat.soHieu + (moiNhat.ngayRa ? ` · ${cachDay(moiNhat.ngayRa)}` : '')} />
          )}
          {/* ĐỘ TUỔI KÈM LÝ DO. Hàng số liệu trên đầu trang chỉ in được "12+"
              — một con số không tự nói được vì sao. App Store bấm vào ô ấy ra
              nguyên một bảng giải thích; câu giải thích ta đã có sẵn trong
              `MO_TA_TUOI`, xưa nay chỉ hiện lúc bấm tải, tức là quá muộn cho
              người đang cân nhắc cho con mình chơi. */}
          <Dong nhan="Độ tuổi"
            giaTri={`${MO_TA_TUOI[napDoTuoi(game.doTuoi)].nhan} · ${MO_TA_TUOI[napDoTuoi(game.doTuoi)].y}`} />
          <Dong nhan="Số bản tải" giaTri={`${game._count.banTai} bản trên ${soHe.length} hệ máy`} />
          <Dong nhan="Có mặt từ" giaTri={game.dangLuc ? cachDay(game.dangLuc) : '—'} />
        </dl>
      </section>

      {/*
        CÁCH CÀI chuyển từ khung tải xuống ĐÂY.

        Trên điện thoại, khung tải nằm trên cả hàng tab — nên mỗi khối gấp
        trong ấy đẩy ảnh chụp và mô tả xuống thêm một nhịp cuộn. App Store
        không có mục này (họ tự cài hộ), nhưng cửa hàng game Java thì người
        dùng phải tự cài, nên bỏ hẳn không được; chỗ đúng của nó là cạnh bảng
        thông tin, nơi người đọc đang tìm hiểu chi tiết chứ không đang bấm tải.
      */}
      {soHe.some((h) => NHAC_KHI_CAI[h.heMay as MaHeMay]) && (
        <section className="space-y-2">
          {soHe.map((h) => {
            const nhac = NHAC_KHI_CAI[h.heMay as MaHeMay];
            if (!nhac) return null;
            return (
              <KhoiGap key={h.heMay} icon={<Info size={16} />}
                tieuDe={`Cách cài trên ${MO_TA_HE[h.heMay as MaHeMay]?.ten ?? h.heMay}`}>
                <p className="text-[13px] leading-relaxed text-mo">{nhac}</p>
              </KhoiGap>
            );
          })}
        </section>
      )}

      {cungTacGia.length > 0 && (
        <KeThe ten={`Game khác của ${tenTacGia}`}
          phu="Cùng người làm ra game này"
          xemThem={duongDanTacGia ?? undefined}
          game={cungTacGia.map(thanhThe)} />
      )}
    </div>
  );
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="min-w-0">
      <dt className="phu">{nhan}</dt>
      <dd className="mt-0.5 font-medium">{giaTri}</dd>
    </div>
  );
}
