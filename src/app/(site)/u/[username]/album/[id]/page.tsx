import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Images, Lock } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { AlbumForm } from '@/components/user/AlbumForm';
import { DeleteAlbumButton } from '@/components/user/DeleteAlbumButton';
import { PhotoActions, PhotoUploader } from '@/components/user/PhotoUploader';
import { getAlbum, PRIVACY_LABELS } from '@/lib/album';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: {
  params: Promise<{ username: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const album = await getAlbum(id, { id: session?.user?.id ?? null }, 1);
  // Không có quyền xem thì tiêu đề cũng không được lộ tên album.
  return album ? { title: album.name, robots: { index: false } } : { title: 'Không tìm thấy album' };
}

export default async function AlbumPage({ params, searchParams }: {
  params: Promise<{ username: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username, id } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const session = await auth();
  const viewer = { id: session?.user?.id ?? null, role: (session?.user as { role?: string } | undefined)?.role };

  // getAlbum trả null cho cả "không có" lẫn "không được xem" — cùng ra 404 nên
  // người ngoài không đoán được album kín có tồn tại hay không.
  const album = await getAlbum(id, viewer, page);
  if (!album) notFound();

  const ownerName = album.owner.name ?? album.owner.username ?? 'Ẩn danh';

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/u/${username}/album`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Album ảnh của {ownerName}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Images size={22} /> {album.name}
            {album.privacy !== 'PUBLIC' && (
              <span className={`chip gap-1 ${PRIVACY_LABELS[album.privacy].chip}`}>
                <Lock size={11} /> {PRIVACY_LABELS[album.privacy].label}
              </span>
            )}
          </h1>
          {album.description && <p className="mt-1 text-sm text-ink-500">{album.description}</p>}
          <p className="retro-sub mt-1 text-ink-400">{fmtCount(album.photoCount)} ảnh</p>
        </div>

        {album.isOwner && <DeleteAlbumButton id={album.id} username={username} name={album.name} />}
      </div>

      {album.isOwner && (
        <div className="mt-4 space-y-3">
          <PhotoUploader albumId={album.id} />
          <AlbumForm initial={{
            id: album.id, name: album.name, description: album.description,
            cover: null, privacy: album.privacy, photoCount: album.photoCount, createdAt: new Date(),
          }} />
        </div>
      )}

      {album.photos.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-ink-400">
          {album.isOwner ? 'Album còn trống, thêm tấm đầu tiên đi.' : 'Album này chưa có ảnh nào.'}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {album.photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? ''} loading="lazy"
                className="aspect-square w-full bg-ink-100 object-cover dark:bg-ink-800" />
              {p.caption && (
                <p className="truncate bg-white/90 px-2 py-1 text-xs text-ink-600 dark:bg-ink-900/90 dark:text-ink-300">
                  {p.caption}
                </p>
              )}
              {album.isOwner && <PhotoActions photoId={p.id} />}
            </li>
          ))}
        </ul>
      )}

      <Pagination page={album.page} totalPages={album.totalPages}
        basePath={`/u/${username}/album/${album.id}`} />
    </div>
  );
}
