import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { db } from '@/lib/db';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { cachDay } from '@/lib/tien-ich';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đã lưu' };

/*
 * DANH SÁCH ĐỂ DÀNH.
 *
 * Khác "Thư viện" ở đúng một chỗ, mà chỗ ấy quan trọng: thư viện ghi việc đã
 * XẢY RA (game nào đã tải), còn đây ghi một Ý ĐỊNH (game định tải). Gộp hai
 * thứ thì mục cập nhật đi nhắc bản mới của game người ta chưa tải bao giờ.
 */
export default async function TrangDaLuu() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const hang = await db.daLuu.findMany({
    where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
    orderBy: { taoLuc: 'desc' },
    take: 200,
    select: { id: true, taoLuc: true, game: { select: CHON_THE } },
  });

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Đã lưu</h1>
        <p className="phu mt-0.5">
          {hang.length > 0 ? `${hang.length} game để dành` : 'Game bạn định tải sau sẽ nằm ở đây'}
        </p>
      </div>

      {hang.length === 0 ? (
        <div className="the p-8 text-center">
          <Bookmark size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa lưu game nào</p>
          <p className="phu mt-1">
            Thấy game hay mà chưa tải ngay được thì bấm “Lưu để dành” ở trang game.
          </p>
          <Link href="/game" className="nut-cai-dam mt-4 !min-h-[38px] !px-5 !text-[13px]">
            Khám phá trò chơi
          </Link>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {hang.map((l) => (
            <li key={l.id}>
              <HangGame game={thanhThe(l.game)} />
              <p className="phu ml-[68px] mt-1">Lưu {cachDay(l.taoLuc)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
