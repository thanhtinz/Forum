'use client';

import { cn } from '@/lib/utils';

/**
 * Cái đĩa và bốn đồng tiền, vẽ thẳng bằng SVG.
 *
 * Bộ ảnh gốc chỉ có hai tấm chữ "Chẵn"/"Lẻ" nền đen viền đỏ — vừa xấu vừa
 * chẳng nói được gì về luật chơi. Vẽ lại bằng SVG có ba cái lợi: nét sắc ở mọi
 * cỡ màn hình, đổi màu theo nền sáng/tối được, và quan trọng nhất là ĐỘNG ĐƯỢC
 * — bốn đồng lật trong lúc xóc rồi mới nằm yên, đúng thứ đang xảy ra.
 *
 * `shapeRendering="crispEdges"` để cạnh không bị làm mượt, giữ đúng chất pixel
 * của mấy trò còn lại trong khu.
 */

/** Một đồng: `ngua` = mặt ngửa (đỏ), ngược lại là mặt sấp (trắng). */
function Dong({ ngua, x, y, r }: { ngua: boolean; x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 1} r={r} className="fill-black/20" />
      <circle cx={x} cy={y} r={r}
        className={ngua ? 'fill-rose-500' : 'fill-stone-100'}
        stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35} />
      {ngua
        ? <circle cx={x} cy={y} r={r * 0.34} className="fill-rose-800" />
        : <rect x={x - r * 0.3} y={y - r * 0.3} width={r * 0.6} height={r * 0.6}
            className="fill-stone-400" />}
    </g>
  );
}

/**
 * @param dong  bốn đồng: 1 là ngửa, 0 là sấp. Rỗng = chưa mở bát.
 * @param xoc   đang xóc, cho cả đĩa rung
 */
export function DiaSocDia({ dong, xoc, kin }: { dong: number[]; xoc?: boolean; kin?: boolean }) {
  const VITRI: [number, number][] = [[34, 34], [66, 34], [34, 66], [66, 66]];
  return (
    <svg viewBox="0 0 100 100" shapeRendering="crispEdges" aria-hidden
      className={cn('h-full w-full text-ink-400', xoc && 'soc-rung')}>
      {/* Lòng đĩa */}
      <circle cx={50} cy={50} r={44} className="fill-amber-200 dark:fill-amber-900/70" />
      <circle cx={50} cy={50} r={38} className="fill-amber-50 dark:fill-amber-950/60" />
      <circle cx={50} cy={50} r={44} fill="none" stroke="currentColor" strokeWidth={3} strokeOpacity={0.4} />

      {kin ? (
        // Úp bát: chưa mở thì không được thấy đồng nào.
        <>
          <path d="M14 58 a36 30 0 0 1 72 0 z" className="fill-stone-400 dark:fill-stone-600" />
          <path d="M14 58 a36 30 0 0 1 72 0 z" fill="none" stroke="currentColor" strokeWidth={3} strokeOpacity={0.5} />
          <rect x={44} y={22} width={12} height={6} className="fill-stone-500 dark:fill-stone-700" />
        </>
      ) : (
        VITRI.map(([x, y], i) => <Dong key={i} ngua={dong[i] === 1} x={x} y={y} r={13} />)
      )}
    </svg>
  );
}
