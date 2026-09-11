import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { gonSo } from '@/lib/tien-ich';

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

export default async function TrangNhaPhatTrien({ params }: { params: Promise<{ ten: string }> }) {
  const { ten } = await params;
  const hang = giaiTen(ten);
  if (!hang) notFound();

  const game = await db.game.findMany({
    where: { ...DANG_HIEN, nhaPhatTrien: { equals: hang, mode: 'insensitive' } },
    orderBy: [{ soLuotTai: 'desc' }, { id: 'desc' }],
    take: 100,
    select: { ...CHON_THE, nhaPhatTrien: true, namPhatHanh: true },
  });
  if (game.length === 0) notFound();

  const tenHien = game[0].nhaPhatTrien ?? hang;
  const tongTai = game.reduce((t, g) => t + g.soLuotTai, 0);
  const nam = game.map((g) => g.namPhatHanh).filter((n): n is number => !!n);
  const khoang = nam.length > 0
    ? (Math.min(...nam) === Math.max(...nam)
        ? String(Math.min(...nam))
        : `${Math.min(...nam)}–${Math.max(...nam)}`)
    : null;

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
          <Building2 size={28} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="phu">Nhà phát triển</p>
          <h1 className="truncate text-[24px] font-bold leading-tight tracking-tight">{tenHien}</h1>
        </div>
      </header>

      <dl className="the flex divide-x divide-vien text-center">
        <O chinh={String(game.length)} nhan={game.length === 1 ? 'trò chơi' : 'trò chơi'} />
        <O chinh={gonSo(tongTai)} nhan="lượt tải" />
        {khoang && <O chinh={khoang} nhan="năm phát hành" />}
      </dl>

      <section>
        <h2 className="tieu-de mb-3">Trò chơi của {tenHien}</h2>
        <ul className="space-y-3.5">
          {game.map((g) => <li key={g.id}><HangGame game={thanhThe(g)} /></li>)}
        </ul>
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
