import Link from 'next/link';
import type { Metadata } from 'next';
import { Trophy, Medal } from 'lucide-react';
import { fmtCount, cn } from '@/lib/utils';
import { getLevelLooks } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';
import {
  RANK_METRICS, RANK_PERIODS, RANK_SIZE, getRanking, isCumulative,
  type RankMetric, type RankPeriod,
} from '@/lib/ranking';
import { Avatar as CosmeticAvatar, UserName } from '@/components/user/Cosmetic';

export const metadata: Metadata = {
  title: 'Bảng xếp hạng',
  description: 'Thành viên đóng góp nhiều nhất trên diễn đàn.',
};
export const dynamic = 'force-dynamic';

/** Màu huy chương cho ba hạng đầu. */
const PODIUM = ['text-amber-500', 'text-slate-400', 'text-orange-400'];

function Avatar({ image, name, className }: { image: string | null; name: string; className: string }) {
  return image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={image} alt="" className={cn('rounded-full object-cover', className)} />
    : <span className={cn('grid place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300', className)}>
        {name.charAt(0).toUpperCase()}
      </span>;
}

export default async function RankingPage({ searchParams }: {
  searchParams: Promise<{ m?: string; t?: string }>;
}) {
  const { m, t } = await searchParams;
  const metric = (RANK_METRICS.find((x) => x.key === m) ?? RANK_METRICS[0]);
  const period = (RANK_PERIODS.find((x) => x.key === t) ?? RANK_PERIODS[2]);
  // Cấp độ là con số tích luỹ nên luôn xếp theo toàn thời gian.
  const effectivePeriod: RankPeriod = isCumulative(metric.key) ? 'all' : period.key;

  const [rows, levelLooks] = await Promise.all([
    getRanking(metric.key as RankMetric, effectivePeriod),
    getLevelLooks(),
  ]);

  const href = (mk: string, tk: string) => `/ranking?m=${mk}&t=${tk}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={22} className="text-amber-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bảng xếp hạng</h1>
      </div>

      {/* Tiêu chí */}
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
        {RANK_METRICS.map((x) => (
          <Link key={x.key} href={href(x.key, period.key)}
            className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              x.key === metric.key
                ? 'border-brand-500 bg-brand-500 font-medium text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
            {x.label}
          </Link>
        ))}
      </div>

      {/* Khoảng thời gian — cấp độ thì không cắt kỳ được nên làm mờ */}
      <div className="no-scrollbar mb-4 flex items-center gap-1.5 overflow-x-auto">
        {RANK_PERIODS.map((x) => (
          <Link key={x.key} href={href(metric.key, x.key)}
            aria-disabled={isCumulative(metric.key)}
            className={cn('shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors',
              isCumulative(metric.key)
                ? 'pointer-events-none text-ink-300 dark:text-ink-600'
                : x.key === period.key
                  ? 'bg-ink-900 font-medium text-white dark:bg-white dark:text-ink-900'
                  : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800')}>
            {x.label}
          </Link>
        ))}
        {isCumulative(metric.key) && (
          <span className="ml-1 text-xs text-ink-400">Cấp độ tính trên toàn thời gian.</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Chưa có dữ liệu cho mục này{effectivePeriod === 'all' ? '' : ` trong ${period.label.toLowerCase()}`}.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {rows.map((r, i) => (
            <div key={r.userId} className={cn('flex items-center gap-3 p-3', i < 3 && 'bg-amber-50/40 dark:bg-amber-950/10')}>
              <span className="w-7 shrink-0 text-center">
                {i < 3
                  ? <Medal size={18} className={cn('mx-auto', PODIUM[i])} />
                  : <span className="text-sm font-bold text-ink-400">{i + 1}</span>}
              </span>

              <CosmeticAvatar image={r.image} name={r.name ?? r.username ?? 'U'}
                cosmetics={r.cosmetics} size={i < 3 ? 44 : 36} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <UserName username={r.username} name={r.name} role={r.role}
                    cosmetics={r.cosmetics} asLink={!!r.username} />
                  <LevelBadge level={r.level} icon={levelLooks.get(r.level)?.icon}
                    color={levelLooks.get(r.level)?.color} name={levelLooks.get(r.level)?.name} />
                </div>
                {r.username && <p className="truncate text-xs text-ink-400">@{r.username}</p>}
              </div>

              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums text-ink-900 dark:text-white">{fmtCount(r.value)}</span>
                <span className="block text-xs text-ink-400">{metric.unit}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-ink-400">
        Hiển thị tối đa {RANK_SIZE} thành viên. Điểm chỉ tính phần kiếm được, không trừ phần đã tiêu.
      </p>
    </div>
  );
}
