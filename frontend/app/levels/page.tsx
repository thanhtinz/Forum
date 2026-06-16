'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface LevelTier {
  id: string;
  level: number;
  name: string;
  icon: string;
  color: string;
  minScore: number;
}

export default function LevelsPage() {
  const [tiers, setTiers] = useState<LevelTier[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<LevelTier[]>('/badges/levels').then(setTiers).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bảng cấp độ</h1>

      <div className="card p-4 text-sm text-ink-600 dark:text-ink-300">
        <p className="mb-1 font-semibold">Cách tính điểm hoạt động:</p>
        <p>
          Điểm hoạt động = số bài viết + số chủ đề × 2 + điểm uy tín.
        </p>
        <p className="mt-1">
          Khi điểm của bạn đạt mốc của một cấp độ, bạn sẽ tự động được nâng lên cấp đó.
        </p>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.id} className="card flex items-center gap-3 p-4">
            <span className="text-2xl">{t.icon}</span>
            <div className="flex-1">
              <div className="font-semibold">Lv.{t.level} {t.name}</div>
            </div>
            <span className="chip">≥ {t.minScore} điểm</span>
          </div>
        ))}
        {tiers.length === 0 && !err && (
          <div className="card p-6 text-center text-ink-500">Chưa có cấp độ nào được cấu hình.</div>
        )}
      </div>
    </div>
  );
}
