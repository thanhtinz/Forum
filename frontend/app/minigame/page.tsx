'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Dices, Users, Coins } from 'lucide-react';
import { fetcher } from '@/lib/api';

const PVP_LINK: Record<string, string> = { TIEN_LEN: '/minigame/tien-len' };

interface GameConfig {
  id: string; type: string; name: string; description?: string;
  minBet: number; maxBet: number; maxPlayers: number;
}

const PVP = ['TIEN_LEN', 'POKER', 'CARO'];

export default function MinigamePage() {
  const { data, isLoading, error } = useSWR<GameConfig[]>('/minigame/games', fetcher);

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-card">
        <h1 className="text-2xl font-bold">Sảnh Minigame</h1>
        <p className="text-white/90">Chơi bằng coin — solo với máy hoặc PvP với người thật.</p>
      </header>

      {isLoading && <div className="p-10 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="card p-6 text-center text-ink-500">Cần đăng nhập để xem sảnh game.</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Dices size={18} className="text-amber-500" /> {g.name}
              </h3>
              {PVP.includes(g.type) && (
                <span className="chip bg-emerald-100 text-emerald-700"><Users size={12} className="mr-1" /> PvP</span>
              )}
            </div>
            {g.description && <p className="mt-1 text-sm text-ink-500">{g.description}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
              <span className="flex items-center gap-1"><Coins size={13} /> {g.minBet.toLocaleString()}–{g.maxBet.toLocaleString()}</span>
              <span>Tối đa {g.maxPlayers} người</span>
            </div>
            {PVP_LINK[g.type] && (
              <Link href={PVP_LINK[g.type]} className="btn-primary mt-3 w-full !py-1.5 text-xs">Vào bàn PvP →</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
