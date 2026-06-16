'use client';

import { useEffect, useState } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function PvpPage() {
  const { user, loading } = useAuth();
  const [opponents, setOpponents] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState('');

  function load() { api.get<any[]>('/game/pvp/opponents').then(setOpponents).catch((e) => setMsg(e.message)); }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  async function fight(targetId: string) {
    setMsg(''); setResult(null);
    try { setResult(await api.post('/game/pvp/auto', { targetId })); } catch (e: any) { setMsg(e.message); }
    load();
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào đấu trường.</div>;

  const myWin = result && (result.winner === 'attacker' || result.win === true || result.result === 'WIN');

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 p-6 text-white shadow-card">
        <Swords /> <h1 className="text-2xl font-bold">Đấu trường PvP</h1>
      </header>
      {msg && <p className="text-sm text-red-500">{msg}</p>}

      {result && (
        <div className={`card p-5 text-center ${myWin ? 'border-emerald-400' : 'border-rose-400'}`}>
          <Trophy className={`mx-auto ${myWin ? 'text-emerald-500' : 'text-ink-400'}`} size={32} />
          <div className="mt-2 text-lg font-bold">{myWin ? 'CHIẾN THẮNG!' : 'Thất bại'}</div>
          {result.rounds && <div className="mt-1 text-xs text-ink-500">{result.rounds.length} hiệp</div>}
          {(result.eloChange != null || result.coinReward != null) && (
            <p className="mt-1 text-sm text-ink-500">{result.eloChange != null && `Elo ${result.eloChange >= 0 ? '+' : ''}${result.eloChange}`} {result.coinReward ? `· +${result.coinReward} coin` : ''}</p>
          )}
          <button onClick={() => setResult(null)} className="btn-outline mt-3 text-xs">Đóng</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {opponents.map((o) => (
          <div key={o.id} className="card flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{o.user?.username || o.id.slice(0, 8)}</div>
              <div className="text-xs text-ink-500">Cấp {o.level} · Lực {o.combatPower} · Elo {o.pvpRank}</div>
            </div>
            <button onClick={() => fight(o.id)} className="btn-primary !py-1.5 text-xs"><Swords size={14} /> Đấu</button>
          </div>
        ))}
        {opponents.length === 0 && <p className="col-span-full text-center text-ink-500">Không tìm thấy đối thủ phù hợp.</p>}
      </div>
    </div>
  );
}
