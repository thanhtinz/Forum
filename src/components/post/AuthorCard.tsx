import Link from 'next/link';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { FollowButton } from './FollowButton';

/** Card tác giả — phong cách zibll: avatar tròn, tên + chữ ký, nút theo dõi, hàng chỉ số. */
export async function AuthorCard({ authorId, viewerId }: { authorId: string; viewerId?: string | null }) {
  const [author, following] = await Promise.all([
    db.user.findUnique({
      where: { id: authorId },
      select: {
        username: true, name: true, image: true, bio: true, level: true, vipTier: true,
        _count: { select: { posts: true, followers: true, comments: true } },
      },
    }),
    viewerId ? db.follow.findFirst({ where: { followerId: viewerId, followingId: authorId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!author) return null;

  const name = author.name ?? author.username ?? 'Ẩn danh';
  const href = `/u/${author.username ?? ''}`;

  return (
    <section className="card mt-6 p-5">
      <div className="flex items-start gap-4">
        <Link href={href} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {author.image
            ? <img src={author.image} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-950" />
            : <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-2xl font-black text-white">{name[0]?.toUpperCase()}</span>}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={href} className="text-base font-bold hover:text-brand-600">{name}</Link>
                <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">Lv{author.level}</span>
                {author.vipTier != null && (
                  <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">VIP{author.vipTier}</span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{author.bio ?? 'Người này chưa có giới thiệu.'}</p>
            </div>
            <FollowButton targetId={authorId} initialFollowing={!!following} initialCount={author._count.followers} self={viewerId === authorId} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 pt-3 text-center dark:divide-ink-800 dark:border-ink-800">
        <Stat value={author._count.posts} label="Bài viết" />
        <Stat value={author._count.followers} label="Người theo dõi" />
        <Stat value={author._count.comments} label="Bình luận" />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold">{fmtCount(value)}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
