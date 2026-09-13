'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleHelp, SquarePen, Star } from 'lucide-react';
import { TamVietDanhGia } from '@/components/game/TamVietDanhGia';
import { gop } from '@/lib/tien-ich';

/**
 * KHỐI "CHẤM SAO" — hàng sao to ở giữa, hai nút bo tròn bên dưới.
 *
 * Đây là dáng "Tap to Rate" của App Store, và nó khác hẳn bản trước ở một
 * điểm: chấm sao chỉ tốn MỘT cú bấm, còn viết chữ thì mở tấm riêng. Bản cũ để
 * cả ô chữ nằm giữa mục đánh giá nên ai cũng phải cuộn qua một biểu mẫu mới
 * đọc được bài của người khác — mà đọc mới là việc chính ở đây.
 *
 * Sao vẽ RỖNG RUỘT bằng màu nhấn chứ không tô vàng: sao vàng đặc là sao của
 * người khác đã chấm (xem `SaoNam`), còn hàng này là lời mời bấm. Hai thứ
 * trông giống nhau thì người ta tưởng game đã được mình chấm rồi.
 */
export function ODanhGia({ gameId, tenGame, icon, tacGia, duongDan, banDau, daDangNhap }: {
  gameId: string;
  tenGame: string;
  icon: string | null;
  tacGia: string;
  duongDan: string;
  banDau: { sao: number; tieuDe: string | null; noiDung: string | null } | null;
  daDangNhap: boolean;
}) {
  // `null` là tấm đang đóng; số là sao vừa bấm ngoài trang (0 = mở suông).
  const [mo, datMo] = useState<number | null>(null);

  if (!daDangNhap) {
    return (
      <div className="py-2 text-center">
        <p className="text-[15px] font-bold">Bạn đã chơi game này?</p>
        <p className="phu mt-0.5">Đăng nhập để chấm sao và để lại vài dòng.</p>
        <Link href="/dang-nhap" className="nut-xam mt-3">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-[15px] font-bold">
        {banDau ? 'Đánh giá của bạn' : 'Chấm sao cho game này'}
      </p>

      <div className="mt-2 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => datMo(n)}
            aria-label={`${n} sao`} aria-pressed={banDau?.sao === n}
            className="p-0.5 transition-transform hover:scale-110">
            <Star size={32} strokeWidth={1.75}
              className={gop('text-nhan', n <= (banDau?.sao ?? 0) ? 'fill-nhan' : 'fill-transparent')} />
          </button>
        ))}
      </div>

      {/*
        HAI NÚT BO TRÒN NẰM CẠNH NHAU, chia đôi bề ngang — đúng cặp "Write a
        Review" và "App Support" của App Store. "Hỗ trợ" ở cửa hàng này dẫn về
        khu diễn đàn của chính game: đó là chỗ hỏi được người đang chơi và cả
        người làm ra game, chứ cửa hàng không có hòm thư hỗ trợ riêng.
      */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => datMo(0)} className="nut-xam !rounded-full gap-1.5">
          <SquarePen size={15} aria-hidden />
          {banDau ? 'Sửa đánh giá' : 'Viết đánh giá'}
        </button>
        <Link href={`/game/${duongDan}/dien-dan`} className="nut-xam !rounded-full gap-1.5">
          <CircleHelp size={15} aria-hidden />
          Hỏi đáp
        </Link>
      </div>

      <TamVietDanhGia gameId={gameId} tenGame={tenGame} icon={icon} tacGia={tacGia}
        banDau={banDau} mo={mo} dongLai={() => datMo(null)} />
    </div>
  );
}
