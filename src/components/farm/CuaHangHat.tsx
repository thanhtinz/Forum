'use client';

import type { CayGiong } from '@/lib/farm';
import { anhNongSan, moTaVu } from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Cửa hàng hạt giống — mỗi giống một tấm thẻ có ảnh nông sản.
 *
 * Dựng làm RUỘT của hộp thoại, mở ra từ căn cửa hàng trong cảnh nông trại,
 * nên ở đây không có khung thẻ cũng không có tiêu đề: hộp thoại đã có sẵn cả
 * hai, vẽ thêm là hai lần viền và hai lần tên cửa hàng chồng lên nhau.
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
    <div>
      {/* Dòng này là thứ quyết định cả lượt mua: hạt rơi xuống ô NÀO. Thiếu nó
          thì bấm một giống xong người chơi phải đi tìm xem cây mọc ở đâu. */}
      <p className="border-b border-[var(--nova-border)] bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {oSeGieo == null
          ? 'Hết ô trống rồi — thu hoạch hoặc mở thêm đất đã.'
          : `Bấm một giống để gieo xuống ô ${oSeGieo + 1}.`}
      </p>

      {/* Ba cột ngay từ điện thoại. Hai cột thì mười một giống xếp thành sáu
          hàng thẻ cao 153px — gần 950px chỉ để chọn hạt, dài hơn cả mảnh ruộng
          bên trên. Ba cột còn bốn hàng, mà ô bấm vẫn rộng ~116px nên không
          bấm nhầm. */}
      <ul className="grid grid-cols-3 gap-2 p-3 sm:gap-3 lg:grid-cols-4">
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
                  className="grid size-12 place-items-center overflow-hidden rounded-lg sm:size-16"
                  style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}
                >
                  <AnhPixel src={anhNongSan(c.key)} phong={2} />
                </span>

                <span className="mt-1.5 block text-[13px] font-bold leading-tight sm:text-sm">{c.name}</span>
                {/* `flex-1`: dòng này dài ngắn khác nhau ("1 giờ 30 phút · thu
                    4–6" chiếm ba dòng, "5 phút · thu 2–3" một dòng). Cho nó ăn
                    hết chỗ thừa thì nhãn giá của cả hàng thẻ nằm thẳng một
                    đường thay vì so le theo độ dài mô tả. */}
                <span className="retro-sub mt-0.5 block flex-1 text-ink-400">
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
    </div>
  );
}
