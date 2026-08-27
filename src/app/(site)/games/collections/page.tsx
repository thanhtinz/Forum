import Link from 'next/link';
import type { Metadata } from 'next';
import { Library } from 'lucide-react';
import { db } from '@/lib/db';
import { assetUrl } from '@/lib/game';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bộ sưu tập game',
  description: 'Các tuyển tập game Java ME do biên tập viên Nova chọn.',
};

const PAGE_SIZE = 24;

export default async function CollectionsPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, collections] = await Promise.all([
    db.gameCollection.count(),
    db.gameCollection.findMany({
      orderBy: [{ featured: 'desc' }, { order: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { games: true } } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <h1 className="zib-title flex items-center gap-2 text-xl"><Library size={20} /> Bộ sưu tập game</h1>

      {collections.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">Chưa có bộ sưu tập nào.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/games/collections/${c.slug}`} className="post-card overflow-hidden">
              {assetUrl(c.cover) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(c.cover)!} alt="" loading="lazy" className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <b className="truncate">{c.name}</b>
                  {c.featured && <span className="chip bg-brand-500 !px-2 !py-0 text-[10px] text-white">Nổi bật</span>}
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.description}</p>}
                <p className="mt-2 text-[11px] text-ink-400">{c._count.games} game</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/games/collections" />
    </div>
  );
}
