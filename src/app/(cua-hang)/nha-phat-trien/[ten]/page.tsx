import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { PhanTrang } from '@/components/PhanTrang';
import { gonSo, kep, soTrang } from '@/lib/tien-ich';

/*
 * Mỗi trang bao nhiêu game.
 *
 * Trước đây lấy `take: 100` rồi thôi — và tệ hơn: mọi con số ở hàng thống kê
 * (số trò chơi, tổng lượt tải, khoảng năm) đều tính từ đúng 100 hàng ấy. Hãng
 * nào làm trên trăm game thì trang này vừa giấu mất phần dôi ra, vừa in ra
 * những con số SAI mà trông vẫn rất chắc chắn.
 */
const MOI_TRANG = 20;

export const dynamic = 'force-dynamic';

/*
 * TRANG NHÀ PHÁT TRIỂN.
 *
 * App Store bấm vào tên hãng dưới tên ứng dụng là ra trang liệt kê hết những
 * gì hãng ấy làm. Ở một cửa hàng game cũ, mục này đáng giá hơn hẳn: người ta
 * nhớ "mấy game của Gameloft hồi đó" rõ hơn là nhớ tên từng game.
 *
 * Tên hãng là một CHUỖI trên bảng Game chứ không phải một bảng riêng, nên
 * trang này tra theo tên. Đổi lại: không cần màn quản lý hãng, không cần lo
 * hãng mồ côi khi xoá game cuối cùng. Cái giá: hai cách gõ khác nhau
 * ("Gameloft" và "GameLoft") thành hai hãng — nên tra KHÔNG PHÂN BIỆT HOA
 * THƯỜNG, và tên hiện ra lấy từ game mới nhất.
 */

/** Đường dẫn dùng tên hãng đã mã hoá, nên trang nào cũng dựng được từ tên. */
function giaiTen(tho: string): string {
  return decodeURIComponent(tho).trim();
}

export async function generateMetadata({ params }: { params: Promise<{ ten: string }> }): Promise<Metadata> {
  const { ten } = await params;
  return { title: giaiTen(ten) };
}

export default async function TrangNhaPhatTrien({ params, searchParams }: {
  params: Promise<{ ten: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { ten } = await params;
  const { trang: trangNhap } = await searchParams;
  const hang = giaiTen(ten);
  if (!hang) notFound();

  const loc = { ...DANG_HIEN, nhaPhatTrien: { equals: hang, mode: 'insensitive' as const } };

  /*
   * Thống kê hỏi thẳng CSDL chứ không cộng từ danh sách đang vẽ.
   *
   * Cộng từ danh sách thì con số chỉ đúng chừng nào cả kho của hãng nằm lọt
   * trong một trang — mà đó chính là điều kiện vừa bị bỏ đi.
   */
  const gom = await db.game.aggregate({
    where: loc,
    _count: { _all: true },
    _sum: { soLuotTai: true },
    _min: { namPhatHanh: true },
    _max: { namPhatHanh: true },
  });
  const tongGame = gom._count._all;
  if (tongGame === 0) notFound();

  const tongTrang = soTrang(tongGame, MOI_TRANG);
  const trang = kep(trangNhap, 1, tongTrang, 1);

  const game = await db.game.findMany({
    where: loc,
    orderBy: [{ soLuotTai: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: { ...CHON_THE, nhaPhatTrien: true, namPhatHanh: true },
  });

  const tenHien = game[0]?.nhaPhatTrien ?? hang;
  const tongTai = gom._sum.soLuotTai ?? 0;
  const namDau = gom._min.namPhatHanh;
  const namCuoi = gom._max.namPhatHanh;
  const khoang = namDau && namCuoi
    ? (namDau === namCuoi ? String(namDau) : `${namDau}–${namCuoi}`)
    : null;

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
          <Building2 size={28} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="phu">Nhà phát triển</p>
          <h1 className="tieu-de-trang truncate">{tenHien}</h1>
        </div>
      </header>

      <dl className="the flex divide-x divide-vien text-center">
        <O chinh={gonSo(tongGame)} nhan="trò chơi" />
        <O chinh={gonSo(tongTai)} nhan="lượt tải" />
        {khoang && <O chinh={khoang} nhan="năm phát hành" />}
      </dl>

      <section>
        <h2 className="tieu-de mb-3">Trò chơi của {tenHien}</h2>
        <ul className="space-y-3.5">
          {game.map((g) => <li key={g.id}><HangGame game={thanhThe(g)} /></li>)}
        </ul>
        <PhanTrang trang={trang} tongTrang={tongTrang}
          dungDuong={(t) => `/nha-phat-trien/${ten}${t > 1 ? `?trang=${t}` : ''}`} />
      </section>

      <Link href="/duyet" className="phu block text-center hover:text-chu">Xem tất cả trò chơi</Link>
    </div>
  );
}

function O({ chinh, nhan }: { chinh: string; nhan: string }) {
  return (
    <div className="flex-1 px-2 py-3">
      <dd className="text-[17px] font-bold leading-none">{chinh}</dd>
      <dt className="phu mt-1">{nhan}</dt>
    </div>
  );
}
