import Link from 'next/link';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { FollowButton } from './FollowButton';
import { getLevelLook } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';

/** Card tác giả — phong cách zibll: dạng dọc căn giữa, hợp cột sidebar & mobile. */
export async function AuthorCard({ authorId, viewerId }: { authorId: string; viewerId?: string | null }) {
  const [author, following] = await Promise.all([
    db.user.findUnique({
      where: { id: authorId },
      select: {
        username: true, name: true, image: true, cover: true, bio: true, level: true,
        _count: { select: { posts: true, followers: true, comments: true } },
      },
    }),
    viewerId ? db.follow.findFirst({ where: { followerId: viewerId, followingId: authorId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!author) return null;

  const look = await getLevelLook(author.level);

  const name = author.name ?? author.username ?? 'Ẩn danh';
  const href = `/u/${author.username ?? ''}`;

  return (
    <section className="card overflow-hidden">
      {/* Ảnh bìa */}
      <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-400"
        style={author.cover ? { backgroundImage: `url(${author.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />

      <div className="-mt-9 flex flex-col items-center px-5 pb-5 text-center">
        <Link href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {author.image
            ? <img src={author.image} alt="" className="h-[72px] w-[72px] rounded-full border-4 border-white object-cover dark:border-ink-900" />
            : <span className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-white bg-brand-500 text-2xl font-black text-white dark:border-ink-900">{name[0]?.toUpperCase()}</span>}
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <Link href={href} className="text-base font-bold hover:text-brand-600">{name}</Link>
          <LevelBadge level={author.level} icon={look?.icon} color={look?.color} name={look?.name} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-ink-500">{author.bio ?? 'Người này chưa có giới thiệu.'}</p>

        <div className="mt-3">
          <FollowButton targetId={authorId} initialFollowing={!!following} initialCount={author._count.followers} self={viewerId === authorId} />
        </div>

        <div className="mt-4 grid w-full grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 pt-3 dark:divide-ink-800 dark:border-ink-800">
          <Stat value={author._count.posts} label="Bài viết" />
          <Stat value={author._count.followers} label="Theo dõi" />
          <Stat value={author._count.comments} label="Bình luận" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-base font-bold">{fmtCount(value)}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
