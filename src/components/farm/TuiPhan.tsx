'use client';

import { anhPhan, loaiPhan } from '@/lib/farm-const';
import { AnhPixel } from './AnhPixel';

/**
 * Chọn bao phân để bón — mở ra từ nút "Bón phân" trên thanh việc.
 *
 * Cùng hình dạng với túi hạt, và cố ý giống hệt: hai việc đều là "chọn một
 * món trong kho rồi dùng lên ô đang chọn", bày hai kiểu khác nhau thì người
 * chơi phải học hai lần.
 *
 * Có bày mức bồi của từng loại: năm loại phân chỉ khác nhau ở giá và ở số quả
 * thu thêm, mà giá thì trả ở cửa hàng rồi — lúc này chỉ còn con số bồi là
 * đáng cân nhắc.
 */
export function TuiPhan({ phan, dangLam, onBon, onToiCuaHang }: {
  phan: { kind: number; qty: number }[];
  dangLam: boolean;
  onBon: (kind: number) => void;
  onToiCuaHang: () => void;
}) {
  if (phan.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-300">Kho chưa có bao phân nào.</p>
        <button type="button" onClick={onToiCuaHang} className="btn-primary mt-3 !py-1.5">
          Tới cửa hàng mua phân
        </button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
      {phan.map((f) => {
        const l = loaiPhan(f.kind);
        return (
          <li key={f.kind}>
            <button
              type="button"
              disabled={dangLam}
              onClick={() => onBon(f.kind)}
              title={l ? `Bón ${l.ten} — thu thêm ${l.them} quả` : undefined}
              aria-label={`Bón ${l?.ten ?? `phân ${f.kind}`}, trong kho còn ${f.qty}`}
              className="flex h-full w-full flex-col items-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 pb-2 pt-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid size-12 place-items-center overflow-hidden rounded-lg"
                style={{ background: 'radial-gradient(circle at 50% 118%, #dfe8cf 0%, #f6faf0 72%)' }}>
                <AnhPixel src={anhPhan(f.kind)} phong={2} />
              </span>
              <span className="mt-1.5 block text-[13px] font-bold leading-tight">{l?.ten ?? `Phân ${f.kind}`}</span>
              <span className="retro-sub mt-0.5 block flex-1 text-ink-400">thu thêm {l?.them ?? 0} quả</span>
              <span className="chip mt-1.5 !px-2 !py-0 text-[11px] tabular-nums">còn {f.qty}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
