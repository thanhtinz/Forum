import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { KhungTai, type BanXem } from '@/components/game/KhungTai';
import { NutChiaSe } from '@/components/game/NutChiaSe';
import { NutLui } from '@/components/game/NutLui';
import { SaoNam } from '@/components/game/SaoNam';
import { TabGame } from '@/components/game/TabGame';
import type { MaHeMay } from '@/lib/he-may';
import { diemSao, gonDungLuong, gonSo } from '@/lib/tien-ich';

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

          {/*
            HÀNG SỐ LIỆU — SỐ TO TRÊN, NHÃN NHỎ DƯỚI. Đúng hai dòng.

            BA ô, đúng số CH Play dùng, và vừa khít bề ngang điện thoại nên
            không phải cuộn. Ô "Hệ máy" đã bỏ: dãy chip chọn hệ nằm ngay bốn
            chục điểm ảnh bên dưới đã nói đúng điều ấy, lại còn nói rõ hơn vì
            liệt kê ra hết chứ không gộp thành "+4 hệ nữa".

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
