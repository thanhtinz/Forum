'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Fish } from 'lucide-react';
import { api } from '@/lib/api';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'trophy' | 'fishing'>('trophy');
  const [trophy, setTrophy] = useState<any[]>([]);
  const [fishing, setFishing] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>('/trophies/leaderboard').then(setTrophy).catch(() => {});
    api.get<any[]>('/fishing/leaderboard').then(setFishing).catch(() => {});
  }, []);

  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Bảng xếp hạng</h1>
        <p className="text-white/90">Vinh danh thành viên xuất sắc của cộng đồng.</p>
      </header>

      <div className="flex gap-2">
        <button onClick={() => setTab('trophy')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${tab === 'trophy' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Trophy size={16} /> Danh hiệu</button>
        <button onClick={() => setTab('fishing')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${tab === 'fishing' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}><Fish size={16} /> Câu cá</button>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {tab === 'trophy' && trophy.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-3 text-sm">
            <span className="flex items-center gap-2"><span className="w-8 text-center font-bold">{medal(i)}</span>
              {r.user ? <Link href={`/profile?u=${r.user.username}`} className="hover:text-brand-600">{r.user.displayName || r.user.username}</Link> : '—'}
              <span className="text-xs text-amber-600">{r.currentTitle}</span>
            </span>
            <span className="font-bold">{r.totalPoints} điểm</span>
          </div>
        ))}
        {tab === 'fishing' && fishing.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 text-sm">
            <span className="flex items-center gap-2"><span className="w-8 text-center font-bold">{medal(i)}</span>{r.displayName || r.username}</span>
            <span className="text-ink-500">Cấp {r.level} · {r.totalCaught} cá</span>
          </div>
        ))}
        {((tab === 'trophy' && trophy.length === 0) || (tab === 'fishing' && fishing.length === 0)) && (
          <div className="p-8 text-center text-ink-500">Chưa có dữ liệu.</div>
        )}
      </div>
    </div>
  );
}
