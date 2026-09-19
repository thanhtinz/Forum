'use client';

import { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { CircleHelp, SquarePen, Star } from 'lucide-react';
import { TamVietDanhGia } from '@/components/game/TamVietDanhGia';
import { chamSaoNhanh } from '@/app/(cua-hang)/game/[duongDan]/viec';
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
  banDau: { sao: number; tieuDe: string | null; noiDung: string | null; anh: string | null } | null;
  daDangNhap: boolean;
}) {
  // `null` là tấm đang đóng; số là sao vừa bấm ngoài trang (0 = mở suông).
  const [mo, datMo] = useState<number | null>(null);

  /*
   * MỘT CÚ BẤM LÀ CHẤM XONG — không mở tấm nào.
   *
   * Bản trước bấm sao là mở tấm viết đánh giá với sao ấy điền sẵn. Nhưng phần
   * lớn người ta chỉ muốn nói "game này hay", không muốn viết gì; bắt họ đi
   * qua một biểu mẫu để nói đúng chừng ấy là bắt trả giá cho thứ họ không cần.
   * App Store chấm luôn tại chỗ, và cửa hàng này nay cũng thế.
   *
   * `useOptimistic` để mấy ngôi sao sáng lên NGAY dưới ngón tay, không đợi máy
   * chủ trả lời. Đây là thao tác nhỏ nhất và hay dùng nhất trong cả trang, nên
   * một nhịp chờ nửa giây ở đây đọc ra thành "bấm không ăn" rồi người ta bấm
   * lại lần nữa. Máy chủ chối thì React tự trả con số về chỗ cũ.
   */
  const [sao, datSao] = useState(banDau?.sao ?? 0);
  const [saoTam, datSaoTam] = useOptimistic(sao);
  const [dangGui, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);

  const cham = (n: number) => {
    datLoi(null);
    batDau(async () => {
      datSaoTam(n);
      const kq = await chamSaoNhanh(gameId, n);
      if (kq?.loi) datLoi(kq.loi);
      else datSao(n);
    });
  };

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
        {saoTam > 0 ? 'Đánh giá của bạn' : 'Chấm sao cho game này'}
      </p>

      {/* `radiogroup`: năm ngôi sao là NĂM LỰA CHỌN LOẠI TRỪ NHAU, không phải
          năm cái nút rời. Bộ đọc màn hình đọc đúng "4 trên 5" thay vì đọc lần
          lượt năm cái nút chẳng liên quan gì tới nhau. */}
      <div className="mt-2 flex justify-center gap-2" role="radiogroup"
        aria-label={`Chấm sao cho ${tenGame}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => cham(n)} disabled={dangGui}
            role="radio" aria-checked={saoTam === n} aria-label={`${n} sao`}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-60">
            <Star size={32} strokeWidth={1.75}
              className={gop('text-nhan', n <= saoTam ? 'fill-nhan' : 'fill-transparent')} />
          </button>
        ))}
      </div>

      {/* Nói ra là đã lưu. Chấm xong mà trang im thì người ta không biết cú bấm
          ấy có tới nơi hay không, và bấm lại lần nữa cho chắc. */}
      <p className="phu mt-1.5 min-h-[18px]" role="status">
        {loi ? <span className="font-medium text-xau">{loi}</span>
          : saoTam > 0 ? `Đã chấm ${saoTam} sao` : 'Bấm vào sao để chấm'}
      </p>

      {/*
        HAI NÚT BO TRÒN NẰM CẠNH NHAU, chia đôi bề ngang — đúng cặp "Write a
        Review" và "App Support" của App Store. "Hỗ trợ" ở cửa hàng này dẫn về
        khu diễn đàn của chính game: đó là chỗ hỏi được người đang chơi và cả
        người làm ra game, chứ cửa hàng không có hòm thư hỗ trợ riêng.
      */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => datMo(0)} className="nut-xam !rounded-full gap-1.5">
          <SquarePen size={15} aria-hidden />
          {banDau?.noiDung || banDau?.tieuDe ? 'Sửa đánh giá' : 'Viết đánh giá'}
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
