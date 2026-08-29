'use client';

import { useState } from 'react';
import type { HatTrongTui, MonTrongKho } from '@/lib/farm';
import { anhNongSan, moTaVu } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Nhà kho — mọi thứ đang cất giữ: hạt giống chưa gieo và nông sản đã thu.
 *
 * Hai thứ cùng một chỗ vì người chơi nghĩ về chúng như nhau — "tôi đang có
 * gì" — chứ không phải "hạt thì tra ở đây, quả thì tra ở kia". Hạt xếp trước
 * vì đó là thứ hay tra hơn: xem còn hạt không rồi mới ra ruộng gieo.
 *
 * Dựng làm ruột hộp thoại nên không có khung thẻ cũng không có tiêu đề.
 *
 * Số lượng muốn bán giữ ngay trong component này chứ không đẩy lên trang:
 * nó chỉ là nút vặn của riêng từng thẻ, trang không cần biết, mà để trên
 * trang thì mỗi lần đồng hồ nhích một giây là cả kho dựng lại theo.
 *
 * Mặc định vặn sẵn mức BÁN HẾT: phần lớn lượt vào kho là để dọn sạch lấy
 * điểm, ai muốn giữ lại vài quả thì vặn xuống.
 */
export function NhaKho({
  kho, tuiHat, dangLam, onBan,
}: {
  kho: MonTrongKho[];
  tuiHat: HatTrongTui[];
  dangLam: boolean;
  onBan: (cropId: string, soLuong: number) => void;
}) {
  const [chon, setChon] = useState<Record<string, number>>({});

  return (
    <div>
      {/* ── Hạt giống đang có ── */}
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

      {/* ── Nông sản đã thu ── */}
      <div className="px-4 pt-3">
        <h3 className="text-sm font-black">Nông sản</h3>
        {kho.length === 0 && (
          <p className="retro-sub mt-1 text-ink-400">
            Kho đang trống — thu hoạch xong nông sản sẽ nằm ở đây.
          </p>
        )}
      </div>

      {kho.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 p-3">
          {kho.map((m) => {
            const so = Math.min(Math.max(1, chon[m.cropId] ?? m.qty), m.qty);
            const vat = (n: number) =>
              setChon((v) => ({ ...v, [m.cropId]: Math.max(1, Math.min(m.qty, n)) }));
            return (
              <li
                key={m.cropId}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--nova-border)] p-2"
              >
                <span
                  className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg"
                  style={{ background: 'radial-gradient(circle at 50% 120%, #e7f0d8 0%, #f7fbf1 70%)' }}
                >
                  <AnhPixel src={anhNongSan(m.cropKey)} phong={2} />
                  <span className="absolute bottom-0 right-0 rounded-tl-md bg-ink-900/80 px-1 text-[10px] font-black text-white">
                    ×{m.qty}
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{m.name}</p>
                  <p className="retro-sub text-ink-400">{m.sellPrice}đ mỗi quả</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {/* Vặn số lượng: bấm nhanh bằng hai nút, gõ thẳng cũng được. */}
                    <span className="inline-flex items-center overflow-hidden rounded-lg border border-[var(--nova-border)]">
                      <button
                        type="button" aria-label={`Bớt một ${m.name}`}
                        disabled={dangLam || so <= 1} onClick={() => vat(so - 1)}
                        className="px-2 py-1 text-sm font-black text-ink-500 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800"
                      >
                        −
                      </button>
                      <input
                        type="number" min={1} max={m.qty} value={so}
                        aria-label={`Số ${m.name} muốn bán`}
                        onChange={(e) => vat(Number(e.target.value) || 1)}
                        className="w-10 border-x border-[var(--nova-border)] bg-transparent py-1 text-center text-xs font-bold outline-none"
                      />
                      <button
                        type="button" aria-label={`Thêm một ${m.name}`}
                        disabled={dangLam || so >= m.qty} onClick={() => vat(so + 1)}
                        className="px-2 py-1 text-sm font-black text-ink-500 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800"
                      >
                        +
                      </button>
                    </span>
                    <button
                      type="button"
                      disabled={dangLam}
                      onClick={() => onBan(m.cropId, so)}
                      className="btn-primary !px-3 !py-1.5 !text-xs whitespace-nowrap disabled:opacity-50"
                    >
                      Bán {so * m.sellPrice}đ
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
