'use client';

import { Clock, Star, Zap } from 'lucide-react';
import type { DonHang } from '@/lib/farm-don';
import { ANH_NHA_KHO, DON_TEN, anhNongSan, moTaConLai } from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Bảng ghi chú — khách đặt hàng, mình gom trong kho ra giao.
 *
 * Thay hẳn cho lái buôn mua lẻ. Bán lẻ thì mọi quả đều bằng nhau và chẳng có
 * gì để tính; đơn hàng thì phải nhắm trước trồng gì, giữ lại bao nhiêu — và
 * thỉnh thoảng có đơn gấp đôi gấp ba đáng để dồn sức.
 *
 * Mỗi món hiện "đang có / cần" chứ không chỉ hiện số cần: thiếu mấy quả là
 * câu hỏi đầu tiên khi nhìn một đơn chưa giao được.
 */

const VE: Record<DonHang['kind'], { lop: string; icon: React.ReactNode }> = {
  THUONG: { lop: 'border-[var(--nova-border)]', icon: null },
  DAC_BIET: {
    lop: 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20',
    icon: <Star size={12} className="fill-amber-400 text-amber-500" aria-hidden />,
  },
  SIEU_TOC: {
    lop: 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/20',
    icon: <Zap size={12} className="fill-rose-400 text-rose-500" aria-hidden />,
  },
};

export function BangDon({ don, now, dangLam, onGiao }: {
  don: DonHang[];
  /** Đồng hồ do trang giữ — đơn siêu tốc đếm ngược theo nó. */
  now: number;
  dangLam: boolean;
  onGiao: (donId: string) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-[var(--nova-border)] bg-gradient-to-r from-sky-50 to-transparent px-4 py-3 dark:from-sky-950/25">
        <AnhPixel src={ANH_NHA_KHO} className="h-10 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-tight">Bảng đơn hàng</h2>
          <p className="retro-sub text-ink-400">
            Khách đặt gì thì gom trong kho ra giao. Đơn đặc biệt ăn đôi, đơn
            siêu tốc ăn ba nhưng có hạn.
          </p>
        </div>
      </header>

      {don.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-400">
          Chưa có ai đặt hàng. Quay lại sau nhé.
        </p>
      ) : (
        <ul className="grid gap-2 p-3 sm:grid-cols-2">
          {don.map((d) => {
            const ve = VE[d.kind];
            const conLai = d.hetHanLuc == null ? null : d.hetHanLuc - now;
            const quaHan = conLai != null && conLai <= 0;
            return (
              <li key={d.id}
                className={cn('flex flex-col rounded-xl border p-2.5', ve.lop)}>
                <div className="mb-2 flex items-center gap-1.5">
                  {ve.icon}
                  <span className="truncate text-sm font-bold">{d.khach}</span>
                  {d.kind !== 'THUONG' && (
                    <span className={cn('chip !px-1.5 !py-0 text-[10px]',
                      d.kind === 'SIEU_TOC'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300')}>
                      {DON_TEN[d.kind]}
                    </span>
                  )}
                  {conLai != null && (
                    <span className={cn('retro-sub ml-auto flex items-center gap-0.5 whitespace-nowrap',
                      quaHan ? 'text-red-600' : 'text-ink-400')}>
                      <Clock size={11} aria-hidden />
                      {quaHan ? 'quá hạn' : moTaConLai(conLai)}
                    </span>
                  )}
                </div>

                <ul className="mb-2 flex flex-1 flex-wrap gap-1.5">
                  {d.items.map((it) => {
                    const du = it.dangCo >= it.qty;
                    return (
                      <li key={it.cropId}
                        title={`${it.name} — đang có ${it.dangCo}, cần ${it.qty}`}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border py-1 pl-1 pr-2',
                          du ? 'border-emerald-300 dark:border-emerald-800'
                             : 'border-dashed border-[var(--nova-border)]',
                        )}>
                        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded"
                          style={{ background: 'radial-gradient(circle at 50% 118%, #e7f0d8 0%, #f7fbf1 70%)' }}>
                          <AnhPixel src={anhNongSan(it.cropKey)} />
                        </span>
                        <span className="whitespace-nowrap text-xs font-bold">{it.name}</span>
                        <span className={cn('text-[11px] font-black tabular-nums',
                          du ? 'text-emerald-600' : 'text-ink-400')}>
                          {it.dangCo}/{it.qty}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  disabled={dangLam || !d.giaoDuoc || quaHan}
                  onClick={() => onGiao(d.id)}
                  title={
                    quaHan ? 'Đơn này quá hạn rồi'
                      : d.giaoDuoc ? `Giao đơn cho ${d.khach}`
                      : 'Chưa gom đủ hàng cho đơn này'
                  }
                  aria-label={`Giao đơn cho ${d.khach}, được ${d.reward} điểm`}
                  className="btn-primary w-full justify-center !py-1.5 text-xs disabled:opacity-50"
                >
                  Giao · {d.reward}đ
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
