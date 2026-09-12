'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { BieuTuongGame } from './BieuTuongGame';
import { Ke } from './Ke';
import { NenGame } from './NenGame';
import { NutCai } from './NutCai';
import { MO_TA_HE } from '@/lib/he-may';
import { gop } from '@/lib/tien-ich';
import type { TheGame } from './the-game';

/**
 * BĂNG NỔI BẬT — khối lớn nhất mặt tiền, lật ngang từng tấm.
 *
 * Cả App Store lẫn CH Play đều mở đầu bằng đúng khối này, và đều vì một lẽ:
 * mặt tiền toàn thẻ vuông đều tăm tắp thì không có gì dẫn mắt, người ta lướt
 * qua mà không dừng ở đâu cả. Một tấm to gấp mười lần thẻ thường mới tạo được
 * chỗ dừng — và đó là chỗ ban quản trị được nói "hãy xem cái này".
 *
 * Nền là dải màu suy ra từ tên game chứ không phải ảnh: cửa hàng chưa có ảnh bìa
 * thật, mà dựng một tấm ảnh giả thì là nói dối người xem về thứ họ sắp tải.
 * Dải màu thì thành thật — nó chỉ là màu, và vẫn làm xong việc dẫn mắt.
 */
export function BangNoiBat({ game }: { game: TheGame[] }) {
  const [dangO, datDangO] = useState(0);

  // Bọc lại vì `Ke` giữ hàm này trong danh sách phụ thuộc của bộ nhớ đệm —
  // truyền thẳng một hàm mới mỗi lần vẽ là bắt nó dựng lại bộ theo dõi liên tục.
  const theoTam = useCallback((i: number) => datDangO(i), []);

  if (game.length === 0) return null;

  return (
    <section aria-labelledby="bang-noi-bat">
      {/* Khối này cố ý không có đầu đề nhìn thấy được — mấy tấm băng tự nói
          lấy. Nhưng nó vẫn cần một đầu đề để bậc không nhảy từ h1 thẳng xuống
          h3, và để bộ đọc màn hình gọi được tên khối. */}
      <h2 id="bang-noi-bat" className="sr-only">Đáng chơi lúc này</h2>

      <Ke nhan="băng nổi bật" theoTam={theoTam} className="-mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
        {game.map((g) => <Tam key={g.id} game={g} />)}
      </Ke>

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
  return (
    <article className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[560px]">
      <Link href={`/game/${game.duongDan}`} className="block overflow-hidden rounded-the">
        {/*
          Tỉ lệ 2:1 cố định. Để chiều cao tự do thì mỗi tấm một chiều cao khác
          nhau, và lúc lật ngang cả khối co giật lên xuống theo từng tấm.
        */}
        <div className="relative aspect-[2/1] w-full">
          <NenGame ten={game.ten} doLuoi={5} />

          {/* Dãy hệ máy nằm ở góc trên — nửa trên tấm vốn trống, mà "chạy được
              trên máy nào" lại đúng là thứ người ta hỏi trước khi bấm vào. */}
          {game.heMay.length > 0 && (
            <span className="absolute left-4 top-3.5 flex flex-wrap gap-1.5">
              {game.heMay.map((h) => (
                <span key={h}
                  className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  {MO_TA_HE[h as keyof typeof MO_TA_HE]?.ten ?? h}
                </span>
              ))}
            </span>
          )}

          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">
              Đáng chơi lúc này
            </p>
            <h3 className="mt-0.5 truncate text-[22px] font-bold leading-tight text-white">
              {game.ten}
            </h3>
          </div>
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
