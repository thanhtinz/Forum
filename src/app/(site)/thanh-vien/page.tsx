import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, Search, Circle } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { LevelBadge } from '@/components/LevelBadge';
import { getLevelLooks } from '@/lib/level';
import { getMembers, isMemberSort, MEMBER_SORTS } from '@/lib/members';
import { cn, fmtAgo, fmtCount } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Thành viên',
  description: 'Danh bạ thành viên của diễn đàn: tìm theo tên, xem ai đang online, ai mới tham gia.',
};
export const dynamic = 'force-dynamic';

export default async function MembersPage({ searchParams }: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; online?: string }>;
}) {
  const { page: pageRaw, q, sort: sortRaw, online: onlineRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const sort = isMemberSort(sortRaw) ? sortRaw : 'active';
  const onlineOnly = onlineRaw === '1';

  const [list, levelLooks] = await Promise.all([
    getMembers({ page, q, sort, onlineOnly }),
    getLevelLooks(),
  ]);

  /** Giữ nguyên các lựa chọn khác khi đổi một thứ. */
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (sort !== 'active') p.set('sort', sort);
    if (onlineOnly) p.set('online', '1');
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    p.delete('page');
    const s = p.toString();
    return s ? `/thanh-vien?${s}` : '/thanh-vien';
  };

  return (
    <div className="container-nova py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-ink-800 dark:text-ink-100">
            <Users size={24} className="text-brand-500" /> Thành viên
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {fmtCount(list.total)} thành viên
            {' · '}
            <span className="text-emerald-600 dark:text-emerald-400">{fmtCount(list.online)} đang online</span>
          </p>
        </div>

        <form action="/thanh-vien" className="flex items-center gap-2">
          {sort !== 'active' && <input type="hidden" name="sort" value={sort} />}
          {onlineOnly && <input type="hidden" name="online" value="1" />}
          <label className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q ?? ''} placeholder="Tìm theo tên…" className="input !py-1.5 !pl-8 text-sm" />
          </label>
          <button type="submit" className="btn-ghost !py-1.5 text-sm">Tìm</button>
        </form>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {MEMBER_SORTS.map((s) => (
          <Link key={s.key} href={href({ sort: s.key === 'active' ? null : s.key })}
            className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors',
              s.key === sort
                ? 'border-brand-500 bg-brand-500 font-medium text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
            {s.label}
          </Link>
        ))}
        <Link href={href({ online: onlineOnly ? null : '1' })}
          className={cn('ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
            onlineOnly
              ? 'border-emerald-500 bg-emerald-500 font-medium text-white'
              : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
          <Circle size={9} className={onlineOnly ? 'fill-current' : 'fill-emerald-500 text-emerald-500'} />
          Chỉ người đang online
        </Link>
      </div>

      {list.items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          {q ? `Không tìm thấy ai khớp “${q}”.` : 'Chưa có thành viên nào.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((m) => m.chip && (
            <Link key={m.id} href={`/u/${m.chip.username ?? ''}`}
              className="card flex gap-3 p-3.5 transition-shadow hover:shadow-card-hover">
              <span className="relative shrink-0">
                <Avatar image={m.chip.image} name={m.chip.name ?? m.chip.username ?? '?'}
                  cosmetics={m.chip.cosmetics} size={48} />
                {/* Chấm xanh nằm đè lên góc avatar, đúng nếp forum wax ngày xưa. */}
                {m.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900"
                    title="Đang online" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2">
                  <UserName username={m.chip.username} name={m.chip.name} role={m.chip.role}
                    level={m.chip.level} cosmetics={m.chip.cosmetics} asLink={false} className="font-bold" />
                  <LevelBadge level={m.chip.level} icon={levelLooks.get(m.chip.level)?.icon}
                    color={levelLooks.get(m.chip.level)?.color} name={levelLooks.get(m.chip.level)?.name} />
                </p>

                {m.mood && <p className="mt-0.5 truncate text-xs italic text-ink-500">“{m.mood}”</p>}

                <p className="retro-sub mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-ink-400">
                  <span>{fmtCount(m.threads + m.replies)} bài</span>
                  <span>{fmtCount(m.points)} điểm</span>
                  {m.karma !== 0 && <span>{m.karma > 0 ? `+${m.karma}` : m.karma} uy tín</span>}
                </p>
                <p className="retro-sub mt-0.5 text-ink-400">
                  {m.online ? 'Đang online' : m.lastSeenAt ? `Ghé ${fmtAgo(m.lastSeenAt)}` : `Tham gia ${fmtAgo(m.createdAt)}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={list.page} totalPages={list.totalPages} basePath={href({})} />
    </div>
  );
}
