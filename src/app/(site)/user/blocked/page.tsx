import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtAgo } from '@/lib/utils';
import { BlockButton } from '@/components/user/BlockButton';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Đã chặn' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function BlockedPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, blocks] = await Promise.all([
    db.block.count({ where: { blockerId: me } }),
    db.block.findMany({
    where: { blockerId: me },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, createdAt: true,
      blocked: { select: { id: true, name: true, username: true, image: true } },
    },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Thành viên đã chặn</h1>
        <p className="text-sm text-ink-500">
          Hai bên không nhắn tin hay theo dõi nhau được. Bài viết công khai thì vẫn xem được như thường.
        </p>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {blocks.length === 0 && (
          <div className="p-10 text-center">
            <ShieldOff size={28} className="mx-auto mb-2 text-ink-300" />
            <p className="text-sm text-ink-500">Bạn chưa chặn ai.</p>
            <p className="mt-1 text-xs text-ink-400">Vào trang cá nhân của một thành viên và bấm “Chặn” nếu cần.</p>
          </div>
        )}

        {blocks.map((b) => {
          const name = b.blocked.name || b.blocked.username || 'Thành viên';
          return (
            <div key={b.id} className="flex items-center gap-3 p-3">
              {b.blocked.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={b.blocked.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-200 font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">
                    {name.charAt(0).toUpperCase()}
                  </span>}
              <div className="min-w-0 flex-1">
                <Link href={`/u/${b.blocked.username}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white">
                  {name}
                </Link>
                <p className="text-xs text-ink-400">Chặn {fmtAgo(b.createdAt)}</p>
              </div>
              <BlockButton targetId={b.blocked.id} targetName={name} initialBlocked compact />
            </div>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/user/blocked" />
    </div>
  );
}
