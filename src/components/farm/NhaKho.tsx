'use client';

import type { HatTrongTui, MonTrongKho } from '@/lib/farm';
import { anhNongSan, anhPhan, loaiPhan, moTaVu } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Nhà kho — mọi thứ đang cất giữ: hạt giống, phân bón và nông sản đã thu.
 *
 * Ba thứ cùng một chỗ vì người chơi nghĩ về chúng như nhau — "tôi đang có
 * gì" — chứ không phải "hạt tra ở đây, phân tra ở kia". Xếp theo thứ tự dùng
 * tới trong một vụ: hạt để gieo, phân để bón, rồi mới tới quả đã thu.
 *
 * Kho KHÔNG bán gì cả. Nông sản chỉ ra khỏi kho bằng đường giao đơn hàng ở
 * bảng ghi chú — bán lẻ cho lái buôn thì mọi quả đều bằng nhau và chẳng có
 * gì để tính, mà đó đúng là phần chơi của nông trại.
 *
 * Dựng làm ruột hộp thoại nên không có khung thẻ cũng không có tiêu đề.
 */
export function NhaKho({ kho, tuiHat, phanBon }: {
  kho: MonTrongKho[];
  tuiHat: HatTrongTui[];
  phanBon: { kind: number; qty: number }[];
}) {
  return (
    <div className="pb-3">
      {/* ── Hạt giống ── */}
      <div className="border-b border-[var(--nova-border)] px-4 py-3">
        <h3 className="mb-2 text-sm font-black">Hạt giống</h3>
        {tuiHat.length === 0 ? (
          <p className="retro-sub text-ink-400">
            Chưa có hạt nào — ghé cửa hàng hạt giống mua đã.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {tuiHat.map((h) => (
              <li key={h.cropId}
                title={`${h.name} — ${moTaVu(h.growMinutes)}`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--nova-border)] py-1 pl-1 pr-2">
                <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded"
                  style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}>
                  <AnhPixel src={anhNongSan(h.cropKey)} />
                </span>
                <span className="whitespace-nowrap text-xs font-bold">{h.name}</span>
                <span className="chip !px-1.5 !py-0 text-[11px] tabular-nums">{h.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Phân bón ── */}
      <div className="border-b border-[var(--nova-border)] px-4 py-3">
        <h3 className="mb-2 text-sm font-black">Phân bón</h3>
        {phanBon.length === 0 ? (
          <p className="retro-sub text-ink-400">
            Chưa có bao phân nào — ghé cửa hàng mua đã.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {phanBon.map((f) => {
              const l = loaiPhan(f.kind);
              return (
                <li key={f.kind} title={l ? `${l.ten} — thu thêm ${l.them} quả` : undefined}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--nova-border)] py-1 pl-1 pr-2">
                  <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded"
                    style={{ background: 'radial-gradient(circle at 50% 118%, #dfe8cf 0%, #f6faf0 72%)' }}>
                    <AnhPixel src={anhPhan(f.kind)} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold">{l?.ten ?? `Phân ${f.kind}`}</span>
                  <span className="chip !px-1.5 !py-0 text-[11px] tabular-nums">{f.qty}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Nông sản ── */}
      <div className="px-4 pt-3">
        <h3 className="mb-2 text-sm font-black">Nông sản</h3>
        {kho.length === 0 ? (
          <p className="retro-sub text-ink-400">
            Kho đang trống — thu hoạch xong nông sản sẽ nằm ở đây.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {kho.map((m) => (
                <li key={m.cropId} title={m.name}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--nova-border)] py-1 pl-1 pr-2">
                  <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded"
                    style={{ background: 'radial-gradient(circle at 50% 120%, #e7f0d8 0%, #f7fbf1 70%)' }}>
                    <AnhPixel src={anhNongSan(m.cropKey)} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold">{m.name}</span>
                  <span className="chip !px-1.5 !py-0 text-[11px] tabular-nums">{m.qty}</span>
                </li>
              ))}
            </ul>
            <p className="retro-sub mt-2 text-ink-400">
              Nông sản ra khỏi kho bằng đường giao đơn ở bảng đơn hàng.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
