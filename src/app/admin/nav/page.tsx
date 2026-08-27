import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { NAV_GROUPS } from '@/lib/nav';
import { NavManager, type NavRow } from '@/components/admin/NavManager';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Menu điều hướng' };
export const dynamic = 'force-dynamic';

export default async function AdminNavPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group: groupRaw } = await searchParams;
  const group = NAV_GROUPS.some((g) => g.value === groupRaw) ? groupRaw! : 'header';

  const links = await db.navLink.findMany({ take: CONFIG_LIST_CAP,
    where: { group },
    orderBy: [{ order: 'asc' }, { label: 'asc' }],
    select: { id: true, label: true, url: true, icon: true, group: true, parentId: true, order: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">
          {NAV_GROUPS.find((g) => g.value === group)?.label ?? 'Menu điều hướng'}
        </h1>
        <p className="text-sm text-ink-500">
          Các mục hiện trên đầu trang và chân trang. Hỗ trợ một cấp con; để trống thì dùng menu mặc định.
        </p>
      </div>

      <NavManager links={links as NavRow[]} group={group} />
    </div>
  );
}
