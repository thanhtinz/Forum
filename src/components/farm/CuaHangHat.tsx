'use client';

import type { CayGiong } from '@/lib/farm';
import { ANH_CUA_HANG, anhNongSan, moTaVu } from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Cửa hàng hạt giống — mỗi giống một tấm thẻ có ảnh nông sản.
 *
 * Bản trước là một lưới nút toàn chữ, mười một giống nhìn như nhau nên chẳng
 * ai nhớ nổi giống nào là giống nào. Ở đây ảnh nông sản đứng trước, ba con số
 * quyết định việc mua (giá hạt, vụ dài bao lâu, thu được mấy quả) xếp thành
 * hàng bên dưới, nên so hai giống chỉ cần liếc.
 *
 * Thẻ nào không mua nổi thì mờ đi chứ vẫn bày ra: người chơi phải thấy trước
 * mấy giống đắt tiền thì mới có cớ trồng tiếp mà gom điểm.
 */

interface Props {
  cay: CayGiong[];
  /** Điểm đang có — chỉ dùng để mờ/sáng thẻ, KHÔNG in ra màn hình. */
  diem: number;
  /** Ô sẽ nhận hạt; `null` nghĩa là chưa có ô trống nào. */
  oSeGieo: number | null;
  dangLam: boolean;
  onGieo: (cayId: string) => void;
}

export function CuaHangHat({ cay, diem, oSeGieo, dangLam, onGieo }: Props) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-[var(--nova-border)] bg-gradient-to-r from-amber-50 to-transparent px-4 py-3 dark:from-amber-950/30">
        <AnhPixel src={ANH_CUA_HANG} className="h-10 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-tight">Cửa hàng hạt giống</h2>
          <p className="retro-sub truncate text-ink-400">
            {oSeGieo == null
              ? 'Hết ô trống rồi — thu hoạch hoặc mở thêm đất đã.'
              : `Bấm một giống để gieo xuống ô ${oSeGieo + 1}.`}
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {cay.map((c) => {
          const du = diem >= c.seedCost;
          const gieoDuoc = du && oSeGieo != null && !dangLam;
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={!gieoDuoc}
                onClick={() => onGieo(c.id)}
                title={
                  oSeGieo == null
                    ? 'Không còn ô trống'
                    : du ? `Gieo ${c.name} xuống ô ${oSeGieo + 1}` : `${c.name} cần ${c.seedCost} điểm`
                }
                className={cn(
                  'flex h-full w-full flex-col items-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 pb-2 pt-2.5 text-center transition-all',
                  gieoDuoc
                    ? 'hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-card-hover'
                    : 'cursor-not-allowed opacity-60',
                )}
              >
                {/* Khay ảnh: nền đất nhạt cho quả nào cũng nổi lên như nhau. */}
                <span
                  className="grid size-16 place-items-center overflow-hidden rounded-lg"
                  style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}
                >
                  <AnhPixel src={anhNongSan(c.key)} phong={2} />
                </span>

                <span className="mt-1.5 block text-sm font-bold leading-tight">{c.name}</span>
                <span className="retro-sub mt-0.5 block text-ink-400">
                  {moTaVu(c.growMinutes)} · thu {c.yieldMin}–{c.yieldMax}
                </span>
                <span className="chip mt-1.5 bg-amber-100 text-[11px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  hạt {c.seedCost}đ
                </span>
              </button>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
