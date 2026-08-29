'use client';

import { useState } from 'react';
import type { MonTrongKho } from '@/lib/farm';
import { ANH_NHA_KHO, anhNongSan } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Nhà kho — nông sản đã thu, xếp thành thẻ có ảnh và bán ngay tại chỗ.
 *
 * Số lượng muốn bán giữ ngay trong component này chứ không đẩy lên trang:
 * nó chỉ là nút vặn của riêng từng thẻ, trang không cần biết, mà để trên
 * trang thì mỗi lần đồng hồ nhích một giây là cả kho dựng lại theo.
 *
 * Mặc định vặn sẵn mức BÁN HẾT: phần lớn lượt vào kho là để dọn sạch lấy
 * điểm, ai muốn giữ lại vài quả thì vặn xuống.
 */
export function NhaKho({
  kho, dangLam, onBan,
}: {
  kho: MonTrongKho[];
  dangLam: boolean;
  onBan: (cropId: string, soLuong: number) => void;
}) {
  const [chon, setChon] = useState<Record<string, number>>({});

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-[var(--nova-border)] bg-gradient-to-r from-lime-50 to-transparent px-4 py-3 dark:from-lime-950/25">
        <AnhPixel src={ANH_NHA_KHO} className="h-10 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-tight">Nhà kho</h2>
          {/* Không `truncate`: câu này là lời chỉ dẫn duy nhất khi kho trống,
              mà thẻ nằm ở cột hẹp nên cắt cụt là mất đúng nửa cuối câu. */}
          <p className="retro-sub text-ink-400">
            {kho.length === 0
              ? 'Kho đang trống — thu hoạch xong nông sản sẽ nằm ở đây.'
              : `Đang giữ ${kho.length} loại nông sản, bán lúc nào cũng được.`}
          </p>
        </div>
      </header>

      {/* Một cột thôi: thẻ nhà kho đã nằm trong lưới hai cột của trang, chia
          đôi lần nữa thì mỗi món chỉ còn hơn trăm điểm ảnh, nút bán vỡ dòng. */}
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
    </section>
  );
}
