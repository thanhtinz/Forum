import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { ModeratorManager, type ForumWithMods } from '@/components/admin/ModeratorManager';

export const metadata: Metadata = { title: 'Điều hành viên' };
export const dynamic = 'force-dynamic';

export default async function AdminModeratorsPage() {
  const [forums, mods] = await Promise.all([
    db.forum.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, slug: true, icon: true },
    }),
    // ForumModerator không có quan hệ tới User nên phải tra người dùng ở bước sau.
    db.forumModerator.findMany({ select: { id: true, forumId: true, userId: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  const users = mods.length
    ? await db.user.findMany({
        where: { id: { in: mods.map((m) => m.userId) } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows: ForumWithMods[] = forums.map((f) => ({
    id: f.id, name: f.name, slug: f.slug, icon: f.icon,
    mods: mods
      .filter((m) => m.forumId === f.id)
      .map((m) => {
        const u = userById.get(m.userId);
        return {
          id: m.id, userId: m.userId,
          name: u?.name ?? '', username: u?.username ?? '(đã xoá)', image: u?.image ?? null,
        };
      }),
  }));

  const staffCount = await db.user.count({ where: { role: { in: ['ADMIN', 'MODERATOR'] } } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Điều hành viên</h1>
        <p className="text-sm text-ink-500">
          Gán thành viên kiểm duyệt riêng từng khu vực: ghim, khoá, sửa và xoá chủ đề trong khu vực đó.
          {' '}{staffCount} quản trị viên toàn site vẫn kiểm duyệt được mọi khu vực.
        </p>
      </div>
      <ModeratorManager forums={rows} />
    </div>
  );
}
