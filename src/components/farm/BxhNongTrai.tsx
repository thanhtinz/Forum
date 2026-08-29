'use client';

import Link from 'next/link';
import type { HangNongTrai } from '@/lib/farm-bxh';
import { cn } from '@/lib/utils';

/**
 * Bảng xếp hạng của riêng nông trại.
 *
 * Xếp theo SỐ ĐƠN ĐÃ GIAO, không theo điểm — điểm là của cả trang, ai chăm
 * bầu cua hay chăm viết bài cũng nhiều điểm, mang sang đây thì bảng này chỉ
 * là bảng xếp hạng diễn đàn chép lại. Hai bảng không dính gì tới nhau.
 */
export function BxhNongTrai({ bxh, toi }: {
  bxh: HangNongTrai[];
  /** Tên đăng nhập của người đang xem, để tô đậm hàng của họ. */
  toi: string | null;
}) {
  if (bxh.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-ink-400">
        Chưa ai giao đơn nào. Giao đơn đầu tiên là đứng đầu bảng.
      </p>
    );
  }

  return (
    <div>
      <p className="border-b border-[var(--nova-border)] bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        Xếp theo số đơn đã giao cho khách. Hoà thì ai nhiều ô đất hơn đứng trên.
      </p>
      <ul className="divide-y divide-[var(--nova-border)]">
        {bxh.map((h) => (
          <li key={h.username}
            className={cn('flex items-center gap-3 px-4 py-2.5',
              h.username === toi && 'bg-amber-50 dark:bg-amber-950/25')}>
            <span className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black',
              h.hang === 1 ? 'bg-amber-400 text-amber-950'
                : h.hang === 2 ? 'bg-ink-300 text-ink-800'
                : h.hang === 3 ? 'bg-orange-300 text-orange-950'
                : 'text-ink-400',
            )}>
              {h.hang}
            </span>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            {h.image
              ? <img src={h.image} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
              : <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-black text-white">
                  {(h.name ?? h.username)[0]?.toUpperCase()}
                </span>}

            <Link href={`/u/${h.username}`}
              className="min-w-0 flex-1 truncate text-sm font-bold hover:text-brand-600">
              {h.name ?? h.username}
            </Link>

            <span className="shrink-0 text-sm font-black tabular-nums">{h.soDon}</span>
            <span className="retro-sub shrink-0 text-ink-400">đơn · {h.soO} ô</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
