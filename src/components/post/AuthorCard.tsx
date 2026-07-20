import Link from 'next/link';
import { db } from '@/lib/db';
import { FileText, Users } from 'lucide-react';
import { fmtCount } from '@/lib/utils';

/** Card thông tin tác giả bài viết. */
export async function AuthorCard({ authorId }: { authorId: string }) {
  const author = await db.user.findUnique({
    where: { id: authorId },
    select: {
      username: true, name: true, image: true, cover: true, bio: true, level: true,
      _count: { select: { posts: true, followers: true } },
    },
  });
  if (!author) return null;

  const name = author.name ?? author.username ?? 'Ẩn danh';
  const href = `/u/${author.username ?? ''}`;

  return (
    <section className="card mt-6 overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-brand-500 to-brand-400"
        style={author.cover ? { backgroundImage: `url(${author.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
      <div className="px-5 pb-5">
        <div className="-mt-9 flex items-end justify-between">
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {author.image
              ? <img src={author.image} alt="" className="h-18 w-18 h-[72px] w-[72px] rounded-2xl border-4 border-white object-cover dark:border-ink-900" />
              : <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl border-4 border-white bg-ink-200 text-2xl font-black text-ink-600 dark:border-ink-900 dark:bg-ink-700 dark:text-ink-200">{name[0]?.toUpperCase()}</span>}
          </Link>
          <Link href={href} className="btn-outline">Xem trang</Link>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Link href={href} className="text-lg font-bold hover:text-brand-600">{name}</Link>
            <span className="chip bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">Lv{author.level}</span>
          </div>
          {author.bio && <p className="mt-1 text-sm text-ink-500">{author.bio}</p>}
          <div className="mt-3 flex gap-5 text-sm text-ink-500">
            <span className="flex items-center gap-1.5"><FileText size={15} /> {fmtCount(author._count.posts)} bài viết</span>
            <span className="flex items-center gap-1.5"><Users size={15} /> {fmtCount(author._count.followers)} người theo dõi</span>
          </div>
        </div>
      </div>
    </section>
  );
}
