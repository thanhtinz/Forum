import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Info, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { PhoDiem } from '@/components/game/PhoDiem';
import { SaoNam } from '@/components/game/SaoNam';
import { ODanhGia } from '@/components/game/ODanhGia';
import { BaiDanhGia, CHON_DANH_GIA } from '@/components/game/BaiDanhGia';
import { KeAnhChup } from '@/components/game/KeAnhChup';
import { TamDanhGia } from '@/components/game/TamDanhGia';
import { MoTaGame } from '@/components/game/MoTaGame';
import { Ke } from '@/components/game/Ke';
import { TheSuKien } from '@/components/game/TheSuKien';
import { SU_KIEN_TREN_TRANG } from '@/lib/su-kien-const';
import { KhoiGap } from '@/components/KhoiGap';
import { MO_TA_HE, NHAC_KHI_CAI, type MaHeMay } from '@/lib/he-may';
import { cachDay, catChu, gonSo } from '@/lib/tien-ich';
import { bocChu, dungChuDam } from '@/lib/chu-dam';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { TOI_DA_ANH_CHUP } from '@/lib/luat-anh-const';

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
      ngonNgu: true, dangLuc: true, nhaPhatTrien: true,
      tacGia: { select: { tenDangNhap: true, tenHienThi: true, tenTacGia: true } },
      // Lấy đúng trần luật định — game cũ lỡ có hơn thì cũng chỉ bày chừng ấy.
      anhChup: {
        orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], take: TOI_DA_ANH_CHUP,
        select: { id: true, duongDan: true, chuThich: true },
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

  const [phanBo, danhGia, cuaToi, soHe] = await Promise.all([
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

  /*
   * Có TÁC GIẢ thì trỏ về trang tác giả, không trỏ về trang gom theo tên hãng.
   * Trang tên hãng gom theo một CHUỖI ghi trên từng game nên hai cách gõ thành
   * hai hãng; trang tác giả gom theo tài khoản nên nó là thật.
   */
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
    <div className="space-y-8">
      {game.anhChup.length > 0 && (
        <KeAnhChup anh={game.anhChup} />
      )}

      {/*
        SỰ KIỆN ĐỨNG TRƯỚC MÔ TẢ.

        Mô tả game nói game LÀ GÌ — thứ không đổi suốt hai mươi năm. Sự kiện
        nói tuần này trong game có gì, và nó có hạn. Thứ có hạn phải đứng trên
        thứ không đổi, không thì tới lúc người ta cuộn xuống đủ sâu để thấy thì
        sự kiện đã hết.
      */}
      {game.suKien.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Sự kiện</h2>
          <Ke nhan="sự kiện" className="-mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
            {game.suKien.map((s) => (
              <TheSuKien key={s.id} duongDanGame={duongDan}
                s={{
                  id: s.id, loai: s.loai, tieuDe: s.tieuDe, moTaNgan: s.moTaNgan, anh: s.anh,
                  batDau: s.batDau.toISOString(), ketThuc: s.ketThuc.toISOString(),
                }} />
            ))}
          </Ke>
        </section>
      )}

      {/*
        "CÓ GÌ MỚI" ĐỨNG TRƯỚC PHẦN GIỚI THIỆU, đúng thứ tự App Store dùng.

        Lẽ của thứ tự ấy: phần giới thiệu là thứ người MỚI tới đọc, mà người
        mới thì mỗi game chỉ có một lần; còn "có gì mới" là thứ người ĐÃ tải
        quay lại xem, và họ quay lại nhiều lần. Xếp theo số lần người ta thật
        sự cần đọc, không xếp theo thứ tự mình viết ra.

        Nhắc lại y nguyên phần ghi chú của bản mới nhất — chỗ chi tiết từng bản
        vẫn nằm trong trục thời gian ở khung tải, và có đường dẫn xuống đó.
      */}
      {moiNhat?.doiMoi && (
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="tieu-de">Có gì mới</h2>
            <a href="#tai" className="text-[13px] font-semibold text-nhan hover:underline">
              Lịch sử phiên bản
            </a>
          </div>
          <p className="phu">
            Bản {moiNhat.soHieu}
            {soHe.length > 1 && ` · ${MO_TA_HE[moiNhat.heMay as MaHeMay]?.ten ?? moiNhat.heMay}`}
            {moiNhat.ngayRa && ` · ${cachDay(moiNhat.ngayRa)}`}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed">{moiNhat.doiMoi}</p>
        </section>
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
          <MoTaGame html={dungChuDam(game.gioiThieu)} />
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
