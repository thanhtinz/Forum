import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { MedalManager, type MedalRow } from '@/components/admin/MedalManager';
import { Pagination } from '@/components/Pagination';
import { tinhSoTrang } from '@/lib/utils';

export const metadata: Metadata = { title: 'Huy chương' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export default async function AdminMedalsPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, medals] = await Promise.all([
    db.medal.count(),
    db.medal.findMany({
    orderBy: [{ rarity: 'desc' }, { createdAt: 'asc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, slug: true, name: true, description: true, icon: true, color: true,
      rarity: true, autoGrant: true, conditionType: true, conditionValue: true,
      _count: { select: { users: true } },
    },
    }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);
  const rows: MedalRow[] = medals.map((m) => ({
    id: m.id, slug: m.slug, name: m.name, description: m.description, icon: m.icon,
    color: m.color, rarity: m.rarity, autoGrant: m.autoGrant,
    conditionType: m.conditionType, conditionValue: m.conditionValue,
    ownerCount: m._count.users,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Huy chương</h1>
        <p className="text-sm text-ink-500">
          Huy chương gắn điều kiện sẽ được trao tự động khi thành viên đạt mốc. Loại “trao tay” dành cho việc tặng riêng.
        </p>
      </div>
      <MedalManager medals={rows} />
      <Pagination page={page} totalPages={totalPages} basePath="/admin/medals" />
    </div>
  );
}
