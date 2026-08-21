import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ForumManager, type ForumRow } from '@/components/admin/ForumManager';

export const metadata: Metadata = { title: 'Diễn đàn' };
export const dynamic = 'force-dynamic';

export default async function AdminForumsPage() {
  const forums = await db.forum.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true, name: true, slug: true, description: true, icon: true, order: true,
      parentId: true, threadCount: true, replyCount: true, postAccess: true, minLevel: true, vipOnly: true,
    },
  });
  const rows: ForumRow[] = forums;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Quản lý diễn đàn</h1>
        <p className="text-sm text-ink-500">Tạo chuyên mục diễn đàn, phân quyền đăng bài theo cấp độ và hạng VIP.</p>
      </div>
      <ForumManager forums={rows} />
    </div>
  );
}
