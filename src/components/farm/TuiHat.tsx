'use client';

import type { HatTrongTui } from '@/lib/farm';
import { anhNongSan, moTaVu } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Túi hạt — mở ra từ nút "Gieo hạt" để chọn gieo hạt nào xuống ô đang chọn.
 *
 * Đây chỉ là chỗ CHỌN, không phải chỗ tra cứu: muốn xem đang có những gì thì
 * vào nhà kho, nơi hạt nằm cạnh nông sản. Nên ở đây mỗi hạt là một nút bấm
 * to, không có gì khác chen vào.
 *
 * Túi rỗng thì không chỉ báo "hết hạt" rồi thôi mà mời luôn sang cửa hàng —
 * để nguyên thì người chơi bấm "Gieo hạt" xong gặp một hộp thoại trống rỗng,
 * không biết đi đâu tiếp.
 */
export function TuiHat({ tui, dangLam, onGieo, onToiCuaHang }: {
  tui: HatTrongTui[];
  dangLam: boolean;
  onGieo: (cayId: string) => void;
  onToiCuaHang: () => void;
}) {
  if (tui.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-300">
          Túi chưa có hạt nào.
        </p>
        <button type="button" onClick={onToiCuaHang} className="btn-primary mt-3 !py-1.5">
          Tới cửa hàng mua hạt
        </button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
      {tui.map((h) => (
        <li key={h.cropId}>
          <button
            type="button"
            disabled={dangLam}
            onClick={() => onGieo(h.cropId)}
            title={`Gieo ${h.name} — ${moTaVu(h.growMinutes)}`}
            aria-label={`Gieo hạt ${h.name}, trong túi còn ${h.qty}`}
            className="flex h-full w-full flex-col items-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 pb-2 pt-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid size-12 place-items-center overflow-hidden rounded-lg"
              style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}>
              <AnhPixel src={anhNongSan(h.cropKey)} phong={2} />
            </span>
            <span className="mt-1.5 block text-[13px] font-bold leading-tight">{h.name}</span>
            <span className="retro-sub mt-0.5 block flex-1 text-ink-400">{moTaVu(h.growMinutes)}</span>
            <span className="chip mt-1.5 !px-2 !py-0 text-[11px] tabular-nums">còn {h.qty}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
