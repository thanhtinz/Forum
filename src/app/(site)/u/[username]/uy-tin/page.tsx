import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ChevronLeft, Scale, ThumbsDown, ThumbsUp } from 'lucide-react';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import { getKarmaPage } from '@/lib/karma';
import { karmaLabel, karmaSigned, karmaTone } from '@/lib/karma-const';
import { cn, fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `Uy tín của @${username}` };
}

/**
 * Sổ uy tín của một thành viên — ai chấm, cộng hay trừ, vì lý do gì.
 *
 * Để công khai chứ không chỉ cho chủ nhà xem: con số uy tín hiện cạnh nick ở
 * khắp diễn đàn, nên người khác cũng phải tra được nó từ đâu ra, không thì
 * chấm bậy chẳng ai biết mà kêu.
 */
export default async function KarmaPage({ params, searchParams }: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const owner = await db.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, karma: true },
  });
  if (!owner) notFound();

  const { items, total, totalPages, up, down } = await getKarmaPage(owner.id, page);
  const name = owner.name ?? owner.username ?? 'Ẩn danh';

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/u/${username}`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Trang cá nhân của {name}
      </Link>

      <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <Scale size={22} /> Sổ uy tín của {name}
      </h1>

      <div className="card mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm text-ink-500">
        <span className="flex items-center gap-2">
          Uy tín <b className={cn('text-lg tabular-nums', karmaTone(owner.karma))}>{karmaSigned(owner.karma)}</b>
          <span className="retro-sub text-ink-400">{karmaLabel(owner.karma)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <ThumbsUp size={15} /> {fmtCount(up)} lượt khen
        </span>
        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
          <ThumbsDown size={15} /> {fmtCount(down)} lượt chê
        </span>
      </div>

      {items.length === 0 ? (
        <p className="card mt-3 p-8 text-center text-ink-400">Chưa ai chấm uy tín cho {name}.</p>
      ) : (
        <ul className="card retro-stripe mt-3 divide-y divide-ink-100 p-0 dark:divide-ink-800">
          {items.map((v) => (
            <li key={v.id} className="flex items-start gap-3 p-3">
              <Avatar image={v.from.image} name={v.from.name ?? v.from.username ?? 'Ẩn danh'}
                cosmetics={v.from.cosmetics} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <UserName username={v.from.username} name={v.from.name} role={v.from.role}
                    cosmetics={v.from.cosmetics} />
                  <span className={cn('chip gap-1 !py-0',
                    v.value > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300')}>
                    {v.value > 0 ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                    {v.value > 0 ? '+1' : '−1'}
                  </span>
                  <time className="retro-sub ml-auto text-ink-400" dateTime={v.createdAt.toISOString()}>
                    {format(v.createdAt, 'HH:mm · dd/MM/yyyy')}
                  </time>
                </div>
                <p className="mt-0.5 break-words text-sm text-ink-600 dark:text-ink-300">{v.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} basePath={`/u/${username}/uy-tin`} />
        </div>
      )}

      <p className="retro-sub mt-3 text-center text-ink-400">{fmtCount(total)} lượt chấm</p>
    </div>
  );
}
