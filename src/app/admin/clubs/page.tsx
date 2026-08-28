import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getClubConfig } from '@/lib/club';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { ClubAdmin } from '@/components/admin/ClubAdmin';

export const metadata: Metadata = { title: 'Câu lạc bộ' };
export const dynamic = 'force-dynamic';

export default async function AdminClubsPage() {
  const [cfg, clubs] = await Promise.all([
    getClubConfig(),
    db.club.findMany({
      take: CONFIG_LIST_CAP,
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, slug: true, name: true, memberCount: true, postCount: true,
        privacy: true, createdAt: true,
        owner: { select: { username: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Câu lạc bộ</h1>
        <p className="text-sm text-ink-500">
          Đặt giá lập câu lạc bộ và giải tán nhóm rác. Nhóm do thành viên tự lập và tự quản lý thành viên.
        </p>
      </div>
      <ClubAdmin createCost={cfg.createCost} clubs={clubs} />
    </div>
  );
}
