import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Images, Lock } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { AlbumForm } from '@/components/user/AlbumForm';
import { getAlbums, PRIVACY_LABELS } from '@/lib/album';
import { fmtAgo, fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `Album ảnh của @${username}` };
}

export default async function AlbumListPage({ params, searchParams }: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const owner = await db.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true },
  });
  if (!owner) notFound();

  const session = await auth();
  const viewer = { id: session?.user?.id ?? null, role: (session?.user as { role?: string } | undefined)?.role };
  const isOwner = viewer.id === owner.id;

  const { items, total, totalPages } = await getAlbums(owner.id, viewer, page);
  const name = owner.name ?? owner.username ?? 'Ẩn danh';

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/u/${username}`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Trang cá nhân của {name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Images size={22} /> Album ảnh
            {total > 0 && <span className="retro-count">{fmtCount(total)}</span>}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {isOwner
              ? 'Album để công khai thì ai cũng xem được; để “chỉ bạn bè” thì phải kết bạn hai chiều mới mở ra.'
              : `Những album ${name} cho bạn xem.`}
          </p>
        </div>
        {isOwner && <AlbumForm />}
      </div>

      {items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-ink-400">
          {isOwner ? 'Bạn chưa có album nào.' : `${name} chưa có album nào cho bạn xem.`}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Link key={a.id} href={`/u/${username}/album/${a.id}`} className="post-card overflow-hidden">
              {a.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover} alt="" loading="lazy" className="h-36 w-full object-cover" />
              ) : (
                <span className="grid h-36 w-full place-items-center bg-ink-100 text-ink-300 dark:bg-ink-800">
                  <Images size={28} />
                </span>
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="min-w-0 truncate">{a.name}</b>
                  {a.privacy !== 'PUBLIC' && (
                    <span className={`chip gap-1 ${PRIVACY_LABELS[a.privacy].chip}`}>
                      <Lock size={11} /> {PRIVACY_LABELS[a.privacy].label}
                    </span>
                  )}
                </div>
                {a.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{a.description}</p>}
                <p className="retro-sub mt-2 text-ink-400">
                  {fmtCount(a.photoCount)} ảnh · {fmtAgo(a.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={`/u/${username}/album`} />
    </div>
  );
}
