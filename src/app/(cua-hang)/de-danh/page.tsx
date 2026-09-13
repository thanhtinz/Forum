import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { db } from '@/lib/db';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { NutBoDeDanh } from '@/components/game/NutBoDeDanh';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Để dành' };

/*
 * ĐỂ DÀNH — game định tải mà chưa tải.
 *
 * Khác thư viện ở đúng một chỗ, mà chỗ ấy là cả lý do có trang này: thư viện
 * ghi việc đã XẢY RA, còn đây là một Ý ĐỊNH. Người mở cửa hàng lúc đang đi xe
 * buýt thấy một game hay nhưng mạng yếu, hoặc máy đang hết chỗ, hoặc game ấy
 * chỉ có bản Java mà máy họ là Android — họ cần một chỗ đánh dấu để tối về mở
 * lại, chứ không phải một nút tải ngay bây giờ.
 *
 * Game đã GỠ khỏi cửa hàng thì lọc thẳng trong câu truy vấn: bày một dòng bấm
 * vào ra trang 404 thì tệ hơn là không bày.
 */
export default async function TrangDeDanh() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap?tiep=/de-danh');

  const hang = await db.deDanh.findMany({
    where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
    orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
    take: 100,
    select: { id: true, game: { select: CHON_THE } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="tieu-de-trang">Để dành</h1>
        <p className="phu mt-0.5">
          {hang.length > 0
            ? `${hang.length} game bạn đánh dấu để tải sau`
            : 'Game bạn đánh dấu để tải sau sẽ nằm ở đây'}
        </p>
      </div>

      {hang.length === 0 ? (
        <div className="the p-8 text-center">
          <Bookmark size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa để dành game nào</p>
          <p className="phu mt-1">
            Mở trang một game rồi bấm dấu trang ở góc trên, game ấy sẽ nằm lại đây.
          </p>
          <Link href="/game" className="nut-xam mt-4">Đi xem game</Link>
        </div>
      ) : (
        <ul className="the-noi danh-sach-the">
          {hang.map((h) => (
            <li key={h.id} className="flex items-center gap-2 p-3.5">
              <span className="min-w-0 flex-1"><HangGame game={thanhThe(h.game)} /></span>
              <NutBoDeDanh gameId={h.game.id} ten={h.game.ten} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
