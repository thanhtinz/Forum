import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ExternalLink, Library } from 'lucide-react';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { NGUONG_DONG, TienTrinhTai } from '@/components/game/TienTrinhTai';
import { TabTai } from '@/components/game/TabTai';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { cuaKhoNha } from '@/lib/kho';
import { tenTepTaiVe } from '@/lib/ten-tep';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { cachDay, gonDungLuong } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tải về',
  // Trang này chỉ sống mấy chục giây và không có gì để ai tìm thấy qua máy tìm.
  robots: { index: false, follow: false },
};

/*
 * TRANG TẢI — hai tab, không có gì khác.
 *
 * Trước đây bấm nút tải là trình duyệt lẳng lặng bắt đầu một lượt tải ở góc
 * dưới cửa sổ, còn trang game thì đứng nguyên. Trên máy bàn thì tạm ổn; trên
 * điện thoại, cái thông báo ấy trôi qua trong một giây và người bấm không chắc
 * mình vừa bấm trúng chưa — nên bấm thêm lần nữa.
 *
 * Bản đầu của trang này bày thêm mã sha256, cách cài trên từng hệ máy và một
 * kệ game gợi ý. Ba thứ ấy đều đúng chỗ ở TRANG GAME, còn ở đây thì chúng biến
 * một màn hình chỉ cần trả lời "xong chưa" thành một trang phải cuộn. Nay
 * đúng hai tab: cái đang chạy, và những cái đã xong.
 */
export default async function TrangTai({ params }: { params: Promise<{ tepId: string }> }) {
  const { tepId } = await params;

  const tep = await db.tepTai.findFirst({
    where: { id: tepId, ban: { game: { trangThai: 'DANG_HIEN' } } },
    select: {
      id: true, loai: true, duongDan: true, tenTep: true, dungLuong: true,
      ban: {
        select: {
          heMay: true, soHieu: true, duongDanCuaHang: true,
          game: { select: { id: true, ten: true, duongDan: true, icon: true } },
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

  const dongPhu = [
    MO_TA_HE[he]?.ten ?? he,
    `bản ${tep.ban.soHieu}`,
    tep.loai,
    nang != null ? gonDungLuong(nang) : null,
  ].filter(Boolean).join(' · ');

  // Thư viện của chính người đang xem. Khách vãng lai vẫn tải được, chỉ là
  // không có sổ nào ghi lại — nên tab kia mời họ đăng nhập thay vì bày sổ rỗng.
  const nguoi = await nguoiHienTai();
  const daTai = nguoi
    ? await db.luotTai.findMany({
        where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
        orderBy: { lanCuoi: 'desc' },
        take: 30,
        select: {
          id: true, heMay: true, soHieu: true, lanCuoi: true,
          game: { select: { ten: true, duongDan: true, icon: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <h1 className="tieu-de-trang">Tải về</h1>

      <TabTai soDaTai={daTai.length}
        dangTai={veThang ? (
          <div className="the space-y-3 p-4">
            <div className="flex items-center gap-3">
              <BieuTuongGame ten={game.ten} icon={game.icon} co={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight">{game.ten}</p>
                <p className="phu mt-0.5 truncate">{dongPhu}</p>
              </div>
            </div>
            <p className="phu">
              {trongKho
                ? 'Tệp này nặng, nên giao cho trình duyệt tải — nó biết nối lại chỗ đứt nếu mạng chập chờn.'
                : 'Tệp này nằm ở máy chủ của nhà phát hành, bấm để sang lấy bản gốc.'}
            </p>
            <a href={`/api/tai/${tep.id}`} className="nut-cai-dam w-full">
              <Download size={17} aria-hidden /> Tải {tep.loai}
              {nang != null && ` · ${gonDungLuong(nang)}`}
            </a>
            {tep.ban.duongDanCuaHang && (
              <a href={tep.ban.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
                className="nut-vien !w-full">
                <ExternalLink size={15} aria-hidden /> Mở trong cửa hàng chính chủ
              </a>
            )}
          </div>
        ) : (
          <TienTrinhTai tepId={tep.id} dungLuong={nang} dongPhu={dongPhu}
            game={{ ten: game.ten, icon: game.icon, duongDan: game.duongDan }}
            ten={tenTepTaiVe(tep.tenTep, game.duongDan, tep.ban.soHieu, tep.loai)} />
        )}
        daTai={
          daTai.length === 0 ? (
            <div className="the p-8 text-center">
              <Library size={22} className="mx-auto text-mo" aria-hidden />
              <p className="mt-2 text-[14px] font-semibold">
                {nguoi ? 'Chưa có game nào' : 'Đăng nhập để có sổ tải'}
              </p>
              <p className="phu mt-1">
                {nguoi
                  ? 'Game bạn tải sẽ tự hiện ở đây, khỏi phải nhớ tên.'
                  : 'Đăng nhập rồi thì mỗi game bạn tải đều được ghi lại, đổi máy vẫn tìm được.'}
              </p>
              {!nguoi && <Link href="/dang-nhap" className="nut-xam mt-4">Đăng nhập</Link>}
            </div>
          ) : (
            /*
              Mỗi dòng: biểu tượng, tên, ngày tải, rồi một nút ở cuối — đúng
              dáng danh sách "Apps" của App Store. Nút ghi "Mở" chứ không ghi
              "Tải lại": phần lớn người mở tab này đang tìm lại game cũ, mà
              tìm lại thì việc tiếp theo là vào xem nó, không phải tải nữa.
            */
            <ul className="the-noi danh-sach-the">
              {daTai.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-3.5">
                  <Link href={`/game/${l.game.duongDan}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <BieuTuongGame ten={l.game.ten} icon={l.game.icon} co={56} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium leading-tight group-hover:underline">
                        {l.game.ten}
                      </span>
                      <span className="phu mt-0.5 block truncate">
                        {MO_TA_HE[l.heMay as MaHeMay]?.ten ?? l.heMay}
                        {l.soHieu ? ` ${l.soHieu}` : ''} · {cachDay(l.lanCuoi)}
                      </span>
                    </span>
                  </Link>
                  <Link href={`/game/${l.game.duongDan}`} className="nut-cai">Mở</Link>
                </li>
              ))}
            </ul>
          )
        } />
    </div>
  );
}
