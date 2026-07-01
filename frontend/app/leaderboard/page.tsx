'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, Medal } from 'lucide-react';
import { api } from '@/lib/api';

export default function LeaderboardPage() {
  const [trophy, setTrophy] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>('/trophies/leaderboard').then(setTrophy).catch(() => {});
  }, []);

  const medal = (i: number) => {
    if (i === 0) return <Crown size={18} className="mx-auto text-amber-500" />;
    if (i === 1) return <Medal size={18} className="mx-auto text-slate-400" />;
    if (i === 2) return <Medal size={18} className="mx-auto text-amber-700" />;
    return `#${i + 1}`;
  };

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Bảng xếp hạng</h1>
        <p className="text-white/90">Vinh danh thành viên xuất sắc của cộng đồng.</p>
      </header>

      <div className="flex gap-2">
        <button className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"><Trophy size={16} /> Danh hiệu</button>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {trophy.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-3 text-sm">
            <span className="flex items-center gap-2"><span className="w-8 text-center font-bold">{medal(i)}</span>
              {r.user ? <Link href={`/profile?u=${r.user.username}`} className="hover:text-brand-600">{r.user.displayName || r.user.username}</Link> : '—'}
              <span className="text-xs text-amber-600">{r.currentTitle}</span>
            </span>
            <span className="font-bold">{r.totalPoints} điểm</span>
          </div>
        ))}
        {trophy.length === 0 && (
          <div className="p-8 text-center text-ink-500">Chưa có dữ liệu.</div>
        )}
      </div>
    </div>
  );
}
