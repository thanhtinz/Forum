import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { LevelManager, type LevelRow } from '@/components/admin/LevelManager';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Cấp độ' };
export const dynamic = 'force-dynamic';

export default async function AdminLevelsPage() {
  const levels = await db.levelRule.findMany({ take: CONFIG_LIST_CAP, orderBy: { level: 'asc' } });

  // Đếm thành viên theo cấp bằng một truy vấn gộp thay vì đếm từng cấp.
  const counts = await db.user.groupBy({ by: ['level'], _count: { _all: true } });
  const countOf = new Map(counts.map((c) => [c.level, c._count._all]));

  const rows: LevelRow[] = levels.map((l) => ({
    id: l.id, level: l.level, name: l.name, expRequired: l.expRequired,
    color: l.color, dailyDownloadLimit: l.dailyDownloadLimit,
    canPostThread: l.canPostThread, canUploadFile: l.canUploadFile,
    userCount: countOf.get(l.level) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Cấp độ</h1>
        <p className="text-sm text-ink-500">
          Mốc EXP để lên cấp và quyền lợi kèm theo. Thành viên tích đủ EXP sẽ tự lên cấp và nhận thông báo.
        </p>
      </div>
      <LevelManager levels={rows} />
    </div>
  );
}
