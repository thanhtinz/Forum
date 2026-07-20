import Link from 'next/link';
import { Flame, Tag as TagIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { AuthorCard } from './AuthorCard';

/** Sidebar trang bài viết: card tác giả (trên cùng) + bài nổi bật + thẻ phổ biến. */
export async function PostSidebar({ authorId, viewerId }: { authorId: string; viewerId?: string | null }) {
  const [hotPosts, tags] = await Promise.all([
    db.post.findMany({ where: { status: 'PUBLISHED' }, orderBy: { viewCount: 'desc' }, take: 5, select: { slug: true, title: true } }),
    db.tag.findMany({ take: 20, select: { slug: true, name: true } }),
  ]);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      <AuthorCard authorId={authorId} viewerId={viewerId} />

      <section className="card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Flame size={15} className="text-accent-500" /> Bài nổi bật</h3>
        <ol className="space-y-2.5">
          {hotPosts.map((p, i) => (
            <li key={p.slug} className="flex gap-2 text-sm">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-bold ${i < 3 ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{i + 1}</span>
              <Link href={`/posts/${p.slug}`} className="line-clamp-2 flex-1 text-ink-700 hover:text-brand-600 dark:text-ink-200">{p.title}</Link>
            </li>
          ))}
          {hotPosts.length === 0 && <li className="text-sm text-ink-400">Chưa có bài viết.</li>}
        </ol>
      </section>

      {tags.length > 0 && (
        <section className="card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold"><TagIcon size={15} className="text-brand-500" /> Thẻ phổ biến</h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link key={t.slug} href={`/tag/${t.slug}`} className="chip bg-ink-100 text-ink-600 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{t.name}</Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
