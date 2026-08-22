import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { FriendLinkManager, type FriendLinkRow } from '@/components/admin/AppearanceManager';

export const metadata: Metadata = { title: 'Liên kết bạn bè' };
export const dynamic = 'force-dynamic';

export default async function AdminLinksPage() {
  const links = await db.friendLink.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, url: true, logo: true, description: true, order: true, active: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Liên kết bạn bè</h1>
        <p className="text-sm text-ink-500">Hiển thị ở chân trang, dùng để trao đổi liên kết với site khác.</p>
      </div>
      <FriendLinkManager links={links as FriendLinkRow[]} />
    </div>
  );
}
