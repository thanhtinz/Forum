'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { BieuTuongGame } from './BieuTuongGame';
import { NutCai } from './NutCai';
import { mauCuaGame } from '@/lib/mau-game';
import { gop } from '@/lib/tien-ich';
import type { TheGame } from './the-game';

/**
 * BĂNG NỔI BẬT — khối lớn nhất mặt tiền, lật ngang từng tấm.
 *
 * Cả App Store lẫn CH Play đều mở đầu bằng đúng khối này, và đều vì một lẽ:
 * mặt tiền toàn thẻ vuông đều tăm tắp thì không có gì dẫn mắt, người ta lướt
 * qua mà không dừng ở đâu cả. Một tấm to gấp mười lần thẻ thường mới tạo được
 * chỗ dừng — và đó là chỗ ban quản kho được nói "hãy xem cái này".
 *
 * Nền là dải màu suy ra từ tên game chứ không phải ảnh: kho chưa có ảnh bìa
 * thật, mà dựng một tấm ảnh giả thì là nói dối người xem về thứ họ sắp tải.
 * Dải màu thì thành thật — nó chỉ là màu, và vẫn làm xong việc dẫn mắt.
 */
export function BangNoiBat({ game }: { game: TheGame[] }) {
  const oRef = useRef<HTMLDivElement>(null);
  const [dangO, datDangO] = useState(0);

  if (game.length === 0) return null;

  /*
   * Chấm trang tính bằng vị trí cuộn chứ không bằng `IntersectionObserver`:
   * mỗi tấm rộng gần bằng cả khung nên chia vị trí cuộn cho bề rộng khung là
   * ra ngay tấm nào đang ở giữa, khỏi cần dựng bộ theo dõi cho từng tấm.
   */
  const theoCuon = () => {
    const o = oRef.current;
    if (!o) return;
    datDangO(Math.round(o.scrollLeft / Math.max(1, o.clientWidth)));
  };

  return (
    <section>
      <div ref={oRef} onScroll={theoCuon} className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
        {game.map((g) => <Tam key={g.id} game={g} />)}
      </div>

      {game.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {game.map((g, i) => (
            <span key={g.id}
              className={gop(
                'h-1.5 rounded-full transition-all duration-200',
                i === dangO ? 'w-5 bg-nhan' : 'w-1.5 bg-vien',
              )} />
          ))}
        </div>
      )}
    </section>
  );
}

function Tam({ game }: { game: TheGame }) {
  const { tu, den } = mauCuaGame(game.ten);

  return (
    <article className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[560px]">
      <Link href={`/game/${game.duongDan}`} className="block overflow-hidden rounded-the">
        {/*
          Tỉ lệ 2:1 cố định. Để chiều cao tự do thì mỗi tấm một chiều cao khác
          nhau, và lúc lật ngang cả khối co giật lên xuống theo từng tấm.
        */}
        <div className="relative aspect-[2/1] w-full"
          style={{ backgroundImage: `linear-gradient(125deg, ${tu}, ${den})` }}>
          {/* Chữ tắt phóng to làm hoa văn nền — cùng màu game, mờ đi để không
              tranh chỗ với dòng chữ đè lên trên. */}
          <span aria-hidden
            className="absolute -right-4 -top-6 select-none font-black leading-none text-white/15"
            style={{ fontSize: 'clamp(120px, 34vw, 220px)' }}>
            {game.ten.slice(0, 2).toUpperCase()}
          </span>
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
          <span className="absolute bottom-3 left-4 right-4">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-white/75">
              Đáng chơi lúc này
            </span>
            <span className="mt-0.5 block truncate text-[22px] font-bold leading-tight text-white">
              {game.ten}
            </span>
          </span>
        </div>
      </Link>

      {/* Hàng dưới băng: biểu tượng thật + nút cài, đúng lối App Store đặt
          dưới mỗi tấm biên tập. Không có nó thì tấm băng chỉ để ngắm. */}
      <div className="mt-2.5 flex items-center gap-3">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{game.ten}</span>
          <span className="phu block truncate">
            {game.theLoai.map((t) => t.ten).join(' · ') || 'Game'}
          </span>
        </span>
        <NutCai duongDan={game.duongDan} />
      </div>
    </article>
  );
}
