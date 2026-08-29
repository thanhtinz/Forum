'use client';

import type { ODat } from '@/lib/farm';
import {
  ANH_MAY_1, ANH_MAY_2, ANH_NEN_DEM, ANH_NEN_NGAY, O_DAT_TOI_DA,
  anhODat, changCua, moTaConLai,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';

/**
 * Mảnh đất — nền trời, mây trôi, và các ô đất bấm được phủ lên trên.
 *
 * Nền là chính tấm `nennongtrai.png` cũ (95×141): trời ở trên, hàng rào cây ở
 * dưới. Lặp NGANG chứ không lặp dọc — lặp dọc thì hàng rào hiện lại giữa trời.
 * Phần trời phía trên tấm ảnh tô bằng đúng màu trời của nó (`#5dbef7` ban
 * ngày, `#264e86` ban đêm) nên khung có cao thêm cũng không thấy chỗ nối.
 *
 * Ảnh gốc 32 pixel, phóng đúng ×3 và `imageRendering: pixelated`: phóng lẻ
 * (hoặc để trình duyệt nội suy) là mỗi nét dày mỏng không đều, nhìn nhoè.
 */

/** Bội số phóng to bộ ảnh 32 pixel. */
const PHONG = 3;

interface Props {
  oDat: ODat[];
  /** Đồng hồ do component cha giữ, nhích mỗi giây. */
  now: number;
  banNgay: boolean;
  dangChon: number | null;
  onChon: (index: number) => void;
}

export function ManhDat({ oDat, now, banNgay, dangChon, onChon }: Props) {
  const troi = banNgay ? '#5dbef7' : '#264e86';

  return (
    // `flex flex-col justify-end`: ô đất phải ĐỨNG TRÊN ĐẤT. Ảnh nền dán ở
    // đáy khung (trời ở trên, hàng rào ở dưới), nên nếu để lưới ô đất chảy từ
    // trên xuống như thường lệ thì mấy ô đất treo lơ lửng giữa trời.
    <div
      className="relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border-2 border-ink-200 dark:border-ink-700"
      style={{
        backgroundColor: troi,
        backgroundImage: `url(${banNgay ? ANH_NEN_NGAY : ANH_NEN_DEM})`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center bottom',
        backgroundSize: `${95 * PHONG}px ${141 * PHONG}px`,
        imageRendering: 'pixelated',
      }}
    >
      {/* Hai dải mây chạy ngang. Chỉ để nhìn nên `aria-hidden`; ai dùng trình
          đọc màn hình không cần nghe kể có mấy đám mây. */}
      <style>{`
        @keyframes nong-trai-may {
          from { transform: translateX(-200px); }
          to   { transform: translateX(calc(100% + 100vw)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nong-trai-may { animation: none !important; }
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ANH_MAY_1} alt="" aria-hidden
        className="nong-trai-may pointer-events-none absolute left-0 top-4 opacity-90"
        style={{
          width: 34 * PHONG, imageRendering: 'pixelated',
          animation: 'nong-trai-may 46s linear infinite',
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ANH_MAY_2} alt="" aria-hidden
        className="nong-trai-may pointer-events-none absolute left-0 top-16 opacity-80"
        style={{
          width: 54 * PHONG, imageRendering: 'pixelated',
          animation: 'nong-trai-may 71s linear infinite',
          animationDelay: '-24s',
        }}
      />

      {/* Chừa đáy khung cho hàng rào trong ảnh nền khỏi bị ô đất đè lên. */}
      <div className="relative grid grid-cols-4 gap-x-2 gap-y-1 px-3 pb-[92px] pt-3">
        {oDat.map((o) => {
          const chang = changCua(o.plantedAt, o.readyAt, now);
          const chin = chang === 'chin';
          const chon = dangChon === o.index;
          return (
            <button
              key={o.index}
              type="button"
              onClick={() => onChon(o.index)}
              title={o.cropName ? `Ô ${o.index + 1} — ${o.cropName}` : `Ô ${o.index + 1} — đang trống`}
              className={cn(
                'group relative flex flex-col items-center justify-end rounded-lg p-1 pb-1.5 transition-all',
                'ring-inset hover:bg-white/20',
                chon && 'bg-white/30 ring-2 ring-amber-400',
                chin && !chon && 'ring-2 ring-emerald-400',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={anhODat(o.cropKey, chang)}
                alt={o.cropName ?? 'Ô đất trống'}
                className={cn('object-contain', chin && 'animate-bounce')}
                style={{ height: 32 * PHONG, imageRendering: 'pixelated' }}
              />

              {/* Nhãn dưới chân ô: còn bao lâu, hoặc chín rồi, hoặc bỏ trống */}
              <span
                className={cn(
                  'mt-1 rounded px-1 text-[11px] font-bold leading-tight',
                  chin ? 'bg-emerald-500 text-white'
                    : o.cropKey != null ? 'bg-ink-900/70 text-white'
                    : 'bg-white/70 text-ink-700',
                )}
              >
                {o.cropKey == null
                  ? `Ô ${o.index + 1}`
                  : chin ? 'Chín rồi!' : moTaConLai((o.readyAt ?? 0) - now)}
              </span>

              {/* Đã tưới — dấu giọt nước ở góc, để biết ô nào còn tưới được */}
              {o.watered && o.cropKey != null && (
                <span
                  className="absolute right-1 top-1 rounded-full bg-sky-500/90 px-1 text-[10px] font-bold text-white"
                  title="Đã tưới vụ này"
                >
                  ~
                </span>
              )}
            </button>
          );
        })}

        {/* Chỗ đất chưa mở, vẽ mờ cho thấy nông trại còn nới ra được */}
        {/* Chỗ đất chưa mở: chỉ vẽ cho ĐẦY HÀNG đang dở, không vẽ thêm hàng
            mới. Bày sẵn cả tám ô xám thì mảnh đất trông như bỏ hoang, mà người
            mới vào có bốn ô là chuyện bình thường. */}
        {Array.from(
          { length: (4 - (oDat.length % 4)) % 4 && oDat.length < O_DAT_TOI_DA
            ? Math.min((4 - (oDat.length % 4)) % 4, O_DAT_TOI_DA - oDat.length)
            : 0 },
          (_, i) => (
            <div
              key={`chua-mo-${i}`}
              aria-hidden
              className="flex flex-col items-center justify-end rounded-lg border-2 border-dashed border-white/40 p-1 pb-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={anhODat(null, null)} alt=""
                className="object-contain opacity-25 grayscale"
                style={{ height: 32 * PHONG, imageRendering: 'pixelated' }}
              />
              <span className="mt-1 rounded bg-white/40 px-1 text-[11px] font-bold leading-tight text-ink-700">
                chưa mở
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
