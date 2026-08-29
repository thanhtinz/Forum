'use client';

import type { HatTrongTui } from '@/lib/farm';
import { anhNongSan, moTaVu } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Túi hạt — bày ngay trong thanh việc dưới mảnh ruộng, không phải trong cửa
 * hàng.
 *
 * Đây là chỗ GIEO, tách hẳn khỏi chỗ MUA: hộp thoại cửa hàng che kín ruộng,
 * mà che ruộng rồi thì không còn ô đất nào để chọn. Ở đây thì ô đang chọn vẫn
 * sáng ngay trên đầu, bấm một gói hạt là thấy cây mọc lên luôn.
 *
 * Cuộn ngang chứ không xuống dòng: thanh việc là một dải mỏng dính dưới chân
 * ruộng, cho nó cao dần theo số giống trong túi thì mỗi lần mua thêm một loại
 * là mảnh ruộng lại bị đẩy lên một nấc.
 */
export function TuiHat({ tui, dangLam, onGieo }: {
  tui: HatTrongTui[];
  dangLam: boolean;
  onGieo: (cayId: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-0.5">
      {tui.map((h) => (
        <button
          key={h.cropId}
          type="button"
          disabled={dangLam}
          onClick={() => onGieo(h.cropId)}
          title={`Gieo ${h.name} — ${moTaVu(h.growMinutes)}, còn ${h.qty} hạt`}
          aria-label={`Gieo hạt ${h.name}, trong túi còn ${h.qty}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--nova-border)] bg-[var(--nova-surface)] py-1 pl-1 pr-2 transition-colors hover:border-emerald-400 disabled:opacity-50"
        >
          <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded"
            style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}>
            <AnhPixel src={anhNongSan(h.cropKey)} />
          </span>
          <span className="whitespace-nowrap text-xs font-bold">{h.name}</span>
          <span className="chip !px-1.5 !py-0 text-[11px] tabular-nums">{h.qty}</span>
        </button>
      ))}
    </div>
  );
}
