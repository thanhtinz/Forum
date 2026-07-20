import Link from 'next/link';
import { db } from '@/lib/db';
import { PostCard, type PostCardData } from '@/components/PostCard';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [slides, categories, posts] = await Promise.all([
    db.slide.findMany({ where: { active: true }, orderBy: { order: 'asc' }, take: 5 }),
    db.category.findMany({ where: { parentId: null }, orderBy: { order: 'asc' }, take: 12 }),
    db.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 18,
      include: {
        author: { select: { username: true, name: true, image: true } },
        category: { select: { name: true, slug: true, color: true } },
        categories: { include: { category: { select: { name: true, slug: true, color: true } } } },
        tags: { include: { tag: { select: { name: true, slug: true } } }, take: 6 },
      },
    }),
  ]);

  const cards: PostCardData[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: p.cover,
    cardStyle: p.cardStyle,
    access: p.access,
    pricePoints: p.pricePoints,
    priceAmount: p.priceAmount,
    viewCount: p.viewCount,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    author: p.author,
    category: p.category,
    categories: p.categories.map((c) => c.category),
    tags: p.tags.map((t) => t.tag),
  }));

  const hero = slides[0];

  return (
    <div className="space-y-6">
      {/* Hero / slider */}
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Link
          href={hero?.link || '#'}
          className="relative flex min-h-[220px] items-end overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white shadow-card sm:min-h-[300px]"
        >
          {hero?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="relative">
            <h1 className="text-2xl font-black drop-shadow sm:text-3xl">{hero?.title ?? 'Chào mừng đến Nova'}</h1>
            <p className="mt-1 max-w-lg text-white/90 drop-shadow">{hero?.subtitle ?? 'Nền tảng blog, diễn đàn và nội dung trả phí.'}</p>
          </div>
        </Link>

        {/* Ô phụ bên phải */}
        <div className="hidden gap-4 lg:grid">
          {slides.slice(1, 3).map((s) => (
            <Link key={s.id} href={s.link || '#'} className="relative flex items-end overflow-hidden rounded-2xl bg-ink-800 p-4 text-white shadow-card">
              {s.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <span className="relative text-sm font-bold drop-shadow">{s.title}</span>
            </Link>
          ))}
          {slides.length <= 1 && (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-400 dark:border-ink-700">
              Thêm slide trong trang quản trị
            </div>
          )}
        </div>
      </section>

      {/* Hàng chuyên mục */}
      {categories.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}
              className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || '#2c7bfe' }} />
              {c.name}
            </Link>
          ))}
        </section>
      )}

      {/* Lưới card + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="zib-title mb-4">Bài viết mới nhất</h2>
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {cards.map((c) => <PostCard key={c.slug} post={c} />)}
            </div>
          ) : (
            <div className="card p-10 text-center text-ink-500">
              Chưa có bài viết. Hãy tạo bài đầu tiên trong trang quản trị.
            </div>
          )}
        </section>

        <HomeSidebar />
      </div>
    </div>
  );
}
